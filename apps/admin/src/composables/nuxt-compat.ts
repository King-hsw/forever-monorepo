/**
 * Nuxt → 纯 Vue 的最小兼容层。
 * 只覆盖后台页面实际用到的少量 Nuxt 组合式 API,语义与原来保持一一对应,
 * 不做任何隐式魔法:页面里用到哪个就从这里显式 import。
 */
import { ref, type Ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

/** 跨组件共享的键值状态(对齐 Nuxt useState) */
const states = new Map<string, Ref<unknown>>()

export function useState<T>(key: string, init: () => T): Ref<T> {
  if (!states.has(key))
    states.set(key, ref(init()))
  return states.get(key) as Ref<T>
}

/**
 * 后台页面里的 useAsyncData 只用于「挂载时拉一次数据」,
 * 返回结构对齐 Nuxt(data/error/pending),不参与 SSR 序列化。
 */
export async function useAsyncData<T>(
  _key: string,
  handler: () => Promise<T>,
  _options?: { server?: boolean; lazy?: boolean },
) {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const pending = ref(true)
  try {
    data.value = await handler()
  }
  catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e))
  }
  finally {
    pending.value = false
  }
  return { data, error, pending }
}

/**
 * 路由跳转。
 * 不用 useRouter()：页面里的调用点常在 `await` 之后（异步 setup 的续体），
 * 此时已脱离组件实例上下文，useRouter 会拿到 undefined 并报
 * 「inject() can only be used inside setup()」。直接取模块级 router 实例最稳。
 */
export async function navigateTo(to: RouteLocationRaw) {
  const { router } = await import('../router')
  return router.push(to)
}

/** 设置浏览器标题与顶栏标题(顶栏读 route.meta.title,这里同步写一份) */
export function useAdminPage(title: string) {
  document.title = `${title} - 补陋阁 后台`
  useState('admin-page-title', () => title).value = title
}
