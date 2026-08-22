// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      // 站点地址（sitemap / RSS 等绝对链接使用），可通过 NUXT_PUBLIC_SITE_URL 覆盖
      siteUrl: 'https://forever.example.com',
    },
  },
  css: ['~/assets/css/main.css'],
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Forever',
      short_name: 'Forever',
      description: 'Forever - 离线可用的 Web 应用',
      start_url: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#6366f1',
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
        { name: 'theme-color', content: '#6366f1' }
      ],
      script: [
        {
          // 首屏防闪烁：在渲染前根据 localStorage / 系统偏好给 <html> 加上 dark 类
          innerHTML:
            "(function(){try{var t=localStorage.getItem('forever-theme');" +
            "if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))" +
            "{document.documentElement.classList.add('dark')}}catch(e){}})()",
          tagPosition: 'head',
        },
      ],
      link: [
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'sitemap', type: 'application/xml', href: '/sitemap.xml' },
        { rel: 'alternate', type: 'application/rss+xml', title: 'Forever', href: '/rss.xml' }
      ]
    }
  }
})
