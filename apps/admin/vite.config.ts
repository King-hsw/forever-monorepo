import path from 'node:path';

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { TDesignResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import type { ConfigEnv, UserConfig } from 'vite';
import { loadEnv } from 'vite';
import svgLoader from 'vite-svg-loader';

const CWD = process.cwd();

// https://vitejs.dev/config/
export default ({ mode }: ConfigEnv): UserConfig => {
  const { VITE_BASE_URL, VITE_PROXY_TARGET } = loadEnv(mode, CWD);
  return {
    base: VITE_BASE_URL,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    css: {
      preprocessorOptions: {
        less: {
          modifyVars: {
            hack: `true; @import (reference) "${path.resolve('src/style/variables.less')}";`,
          },
          math: 'strict',
          javascriptEnabled: true,
        },
      },
    },

    plugins: [
      vue(),
      vueJsx(),
      svgLoader(),
      // TDesign 按需引入：模板里的 <t-xxx> 自动转成 import { Xxx } from 'tdesign-vue-next'。
      // 每个组件的 JS 自带 `import './style/css.mjs'`，样式会随之按需带入，
      // 所以只有全量的基础样式（es/style/index.css）需要在 main.ts 里手动引。
      // 注意：JSX 里的 <t-xxx> 不会被本插件重写，需要显式 import（见 MenuContent.vue）。
      Components({
        dts: 'src/types/components.d.ts',
        resolvers: [TDesignResolver({ library: 'vue-next' })],
      }),
    ],

    server: {
      port: 3002,
      host: '0.0.0.0',
      allowedHosts: true,
      // 开发期把 /api 转发到 forever-server，避免浏览器跨域。
      // 生产环境同源部署，由 nginx 反代 /api，无需代理。
      proxy: {
        '/api': {
          target: VITE_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },

    // https://github.com/vueuse/vueuse/issues/5387#issuecomment-4734186040
    build: {
      rolldownOptions: {
        onLog(level, log, defaultHandler) {
          if (log.code === 'INVALID_ANNOTATION') return null;
          else defaultHandler(level, log);
        },
      },
    },
  };
};
