import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 与 apps/web 的 ~ 语义对齐,迁移过来的页面不用改 import 前缀
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // 关键:改写 origin 头,否则 Spring Security 会拒绝
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:8080')
          })
        },
      },
      // 图片走与 web 相同的图床代理,编辑器插图/头像预览依赖它
      '/images': {
        target: 'http://10.0.0.16:9011/blog',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
