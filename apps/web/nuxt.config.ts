// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // 页面导航启用 View Transition：用浏览器原生的交叉淡化，纯合成器动画不卡顿
  experimental: {
    viewTransition: true,
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // forever-server 后端地址：仅服务端 SSR 使用，直连后端不走代理，
    // 运行时可通过 NUXT_API_BASE 覆盖
    apiBase: 'http://localhost:8080',
    public: {
      // 站点地址（sitemap / RSS 等绝对链接使用），可通过 NUXT_PUBLIC_SITE_URL 覆盖
      siteUrl: 'https://forever.example.com',
      // 浏览器端 API 地址：默认空 = 同源，开发走 devProxy、生产由 nginx 转发；
      // 仅前后端不同域部署且不经过网关时才需要填写
      apiBase: '',
    },
  },
  // 开发环境：浏览器发出的 /api/** 及 rss/sitemap 由 devProxy 转发到后端；
  // 注意 devProxy 对 SSR 内部 $fetch 无效，SSR 靠上面的 apiBase 直连
  nitro: {
    devProxy: {
      // 注意：当前 nitropack 的 devProxy 转发时会剥掉匹配的前缀（/api/），
      // 因此 target 必须带上 /api 才能还原真实路径
      '/api/': {
        target: 'http://localhost:8080/api',
        changeOrigin: true,
        // Spring Security 会校验 Origin，改写为后端自身地址以通过 CORS 校验
        headers: { origin: 'http://localhost:8080' },
      },
      '/rss.xml': { target: 'http://localhost:8080/rss.xml', changeOrigin: true },
      '/sitemap.xml': { target: 'http://localhost:8080/sitemap.xml', changeOrigin: true },
    },
  },
  // prose.css：MarkdownView 与 TiptapEditor 共用的文章排版（所见即所得）
  css: ['~/assets/css/main.css', '~/assets/css/prose.css'],
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '补陋阁',
      short_name: '补陋阁',
      description: '补陋阁 —— 斯是陋室，惟吾德馨',
      start_url: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      lang: 'zh-CN',
      icons: [
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: ({ request, sameOrigin }) =>
            request.mode === 'navigate' && sameOrigin,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 32,
              maxAgeSeconds: 60 * 60 * 24
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: true,
      navigateFallback: '/'
    }
  },
  app: {
    head: {
      meta: [
        { name: 'theme-color', content: '#ffffff' },
        // iOS standalone 模式：状态栏与页面背景同色
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        // 刘海屏：页面延伸到安全区外，配合 CSS env(safe-area-inset-*) 使用
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ],
      script: [      ],
      link: [
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'sitemap', type: 'application/xml', href: '/sitemap.xml' },
        // 毛笔楷书字体（OFL 开源）：仅用于背景书法水印，Google Fonts 按 unicode-range 分包，只下载用到的十几个字
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap' },
      ]
    }
  }
})
