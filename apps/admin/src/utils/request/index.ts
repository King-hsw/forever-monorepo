/**
 * Axios 配置：对接 forever-server
 *
 * 与后端的关键约定（详见 src/api/model/types.ts 与后端 common 包）：
 * - 统一响应体 ApiResponse<T>，code === 0 为成功；非 0 时用 message 作为错误提示
 * - 认证走 Authorization: Bearer <accessToken>（令牌是不透明串，非 JWT）
 * - 401 先用 refreshToken 静默续期并重放一次请求，刷新失败才跳登录页
 * - 后端 CORS 未开启 allowCredentials，故不携带 Cookie，令牌只走请求头
 */
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import isString from 'lodash/isString';
import merge from 'lodash/merge';

import { ErrorCode } from '@/api/model/types';
import { ContentTypeEnum } from '@/constants';
import { useUserStore } from '@/store';

import { VAxios } from './Axios';
import type { AxiosTransform, CreateAxiosOptions } from './AxiosTransform';
import { formatRequestDate, setObjToUrlParams } from './utils';

/** 业务错误：携带后端错误码，便于调用方按 code 分支处理 */
export class ApiError extends Error {
  code: number;

  constructor(message: string, code = -1) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** 后端地址。留空 = 同源：开发由 vite proxy 转发，生产由 nginx 反代 /api */
const apiUrl = import.meta.env.VITE_API_URL || '';

/** 跳转登录页（带 redirect 回跳参数），已在登录页时不重复跳 */
function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  if (pathname === '/login') return;
  const redirect = encodeURIComponent(`${pathname}${search}${hash}`);
  window.location.href = `/login?redirect=${redirect}`;
}

/** 401 单飞刷新：并发的多个 401 只触发一次 /api/auth/refresh */
let refreshing: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const userStore = useUserStore();
  if (!userStore.refreshToken) return false;
  try {
    // 用裸 axios 而非 request 实例：避免刷新请求自身失败时再次进入刷新逻辑
    const res = await axios.post(
      `${apiUrl}/api/auth/refresh`,
      { refreshToken: userStore.refreshToken },
      {
        headers: { 'Content-Type': ContentTypeEnum.Json },
        withCredentials: false,
        timeout: 10000,
      },
    );
    const body = res.data;
    if (body?.code !== 0 || !body?.data?.accessToken) return false;
    userStore.setToken({
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
      expiresIn: body.data.expiresIn,
      refreshExpiresIn: body.data.refreshExpiresIn,
    });
    return true;
  } catch {
    return false;
  }
}

function refreshAccessToken(): Promise<boolean> {
  refreshing ??= performRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// 数据处理，方便区分多种处理方式
const transform: AxiosTransform = {
  // 处理响应数据：解包 ApiResponse<T>
  transformRequestHook: (res, options) => {
    const { isTransformResponse, isReturnNativeResponse } = options;

    // 如果204无内容直接返回
    const method = res.config.method?.toLowerCase();
    if (res.status === 204 && ['put', 'patch', 'delete'].includes(method ?? '')) {
      return res;
    }

    // 是否返回原生响应头 比如：需要获取响应头时使用该属性
    if (isReturnNativeResponse) {
      return res;
    }
    // 不进行任何处理，直接返回
    // 用于页面代码可能需要直接获取code，data，message这些信息时开启
    if (!isTransformResponse) {
      return res.data;
    }

    const { data } = res;
    if (!data) {
      throw new ApiError('请求接口错误：响应体为空');
    }

    // code === 0 才是成功；其余用后端 message 作为提示文案
    if (data.code !== 0) {
      throw new ApiError(data.message || `请求失败（错误码 ${data.code}）`, data.code);
    }
    return data.data;
  },

  // 请求前处理配置
  beforeRequestHook: (config, options) => {
    const { apiUrl: baseUrl, isJoinPrefix, urlPrefix, joinParamsToUrl, formatDate } = options;

    // 添加接口前缀（本项目 API 层直接书写完整路径，默认不启用）
    if (isJoinPrefix && urlPrefix && isString(urlPrefix)) {
      config.url = `${urlPrefix}${config.url}`;
    }

    // 将baseUrl拼接
    if (baseUrl && isString(baseUrl)) {
      config.url = `${baseUrl}${config.url}`;
    }

    const params = config.params || {};
    const data = config.data || false;

    if (formatDate && data && !isString(data)) {
      formatRequestDate(data);
    }

    if (config.method?.toUpperCase() === 'GET') {
      // GET 的 params 原样保留。
      // 注意：不再附加时间戳参数，避免污染请求 URL 与后端日志
      config.params = params;
    } else if (!isString(params)) {
      // 非 GET 请求：params 始终作为 query 保留（后端部分接口如友链驳回把 reason 放在 query），
      // 请求体只认调用方显式传入的 data。
      if (formatDate) {
        formatRequestDate(params);
      }
      config.params = params;
      if (Reflect.has(config, 'data') && config.data) {
        config.data = data;
      }
      if (joinParamsToUrl) {
        config.url = setObjToUrlParams(config.url as string, { ...config.params, ...(config.data as object) });
      }
    } else {
      // 兼容restful风格
      config.url += params;
      config.params = undefined;
    }
    return config;
  },

  // 请求拦截器处理
  requestInterceptors: (config, options) => {
    const userStore = useUserStore();
    const { accessToken } = userStore;

    if (accessToken && (config as Recordable)?.requestOptions?.withToken !== false) {
      // 令牌为不透明串，必须以 Bearer 前缀发送
      (config as Recordable).headers.Authorization = options.authenticationScheme
        ? `${options.authenticationScheme} ${accessToken}`
        : accessToken;
    }
    return config;
  },

  // 响应拦截器处理
  responseInterceptors: (res) => {
    return res;
  },

  // 响应错误处理
  responseInterceptorsCatch: async (error: any, instance: AxiosInstance) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean; retryCount?: number }) | undefined;
    const status: number | undefined = error.response?.status;
    const body = error.response?.data;
    const backendMessage: string | undefined = body?.message;

    // 401：令牌过期或无效，先静默续期并重放一次
    if (status === 401 && config && !config._retried) {
      const url = typeof config.url === 'string' ? config.url : '';
      // 登录 / 刷新接口自身的 401 是业务失败（账号密码错误、refresh 失效），不触发续期
      if (!url.includes('/auth/')) {
        config._retried = true;
        if (await refreshAccessToken()) {
          return instance.request(config as AxiosRequestConfig);
        }
        useUserStore().resetAuth();
        redirectToLogin();
      }
      throw new ApiError(backendMessage || '登录已过期，请重新登录', ErrorCode.UNAUTHORIZED);
    }

    // 403：已登录但缺权限
    if (status === 403) {
      throw new ApiError(backendMessage || '没有权限执行该操作', ErrorCode.FORBIDDEN);
    }

    // 网络错误（无响应）对幂等的 GET 做有限重试，避免超时导致的偶发失败
    const retryOptions = (config as any)?.requestOptions?.retry;
    const method = (config?.method || 'get').toUpperCase();
    if (!status && config && retryOptions && method === 'GET') {
      config.retryCount = config.retryCount || 0;
      if (config.retryCount < retryOptions.count) {
        config.retryCount += 1;
        await new Promise((resolve) => {
          setTimeout(resolve, retryOptions.delay || 1000);
        });
        return instance.request(config as AxiosRequestConfig);
      }
    }

    throw new ApiError(backendMessage || error.message || '网络请求失败', body?.code ?? -1);
  },
};

function createAxios(opt?: Partial<CreateAxiosOptions>) {
  return new VAxios(
    merge(
      <CreateAxiosOptions>{
        // 令牌以 "Bearer <token>" 形式发送，与后端 SecurityConfig 的解析方式一致
        authenticationScheme: 'Bearer',
        // 超时
        timeout: 15 * 1000,
        // 后端未开启 allowCredentials，携带 Cookie 会导致跨域响应被浏览器拒绝
        withCredentials: false,
        // 头信息
        headers: { 'Content-Type': ContentTypeEnum.Json },
        // 数据处理方式
        transform,
        // 配置项，下面的选项都可以在独立的接口请求中覆盖
        requestOptions: {
          // 接口地址（留空 = 同源）
          apiUrl,
          // API 层直接书写 /api/... 完整路径，不再叠加前缀
          isJoinPrefix: false,
          urlPrefix: '',
          // 是否返回原生响应头 比如：需要获取响应头时使用该属性
          isReturnNativeResponse: false,
          // 需要对返回数据进行处理
          isTransformResponse: true,
          // post请求的时候添加参数到url
          joinParamsToUrl: false,
          // 格式化提交参数时间
          formatDate: true,
          // 是否忽略请求取消令牌
          // 如果启用，则重复请求时不进行处理
          // 如果禁用，则重复请求时会取消当前请求
          ignoreCancelToken: true,
          // 是否携带token
          withToken: true,
          // 网络错误重试（仅对 GET 生效，见 responseInterceptorsCatch）
          retry: {
            count: 2,
            delay: 1000,
          },
        },
      },
      opt || {},
    ),
  );
}
export const request = createAxios();
