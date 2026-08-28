// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // 页面导航启用 View Transition：用浏览器原生的交叉淡化，纯合成器动画不卡顿
  experimental: {
    viewTransition: true,
  },
  compatibilityDate: '2025-07-15',
  // 开发服务绑定所有网卡（0.0.0.0），局域网设备可直接通过本机 IP 访问
  devServer: {
    host: '0.0.0.0',
  },
  // 后台纯客户端渲染：服务器不输出 admin 页面 HTML，未登录访问只见空壳
  routeRules: {
    '/admin/**': { ssr: false },
  },
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
      '/images': {
            target: 'http://10.0.0.16:9011/blog',  // target 里带上 /blog
            changeOrigin: true,
      },
      '/rss.xml': { target: 'http://localhost:8080/rss.xml', changeOrigin: true },
      '/sitemap.xml': { target: 'http://localhost:8080/sitemap.xml', changeOrigin: true },
    },
  },
  // prose.css：MarkdownView 与 TiptapEditor 共用的文章排版（所见即所得）
  // hljs-dark.css：代码高亮的深色 token 层（浅色基线是各组件引入的 highlight.js github.css）
  css: ['~/assets/css/main.css', '~/assets/css/prose.css', '~/assets/css/hljs-dark.css'],
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt', '@nuxt/icon'],
  // 图标：iconify 本地集合（@iconify-json/lucide），构建时打包、运行时不请求外网；
  // 默认 css 模式用 mask 渲染，颜色随 currentColor、大小随 font-size，与现有线性 SVG 风格一致
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
      globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,woff2}'],
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
        // 禁双指捏合缩放页面：Android 靠 viewport 即可；iOS Safari 自 10 起无视这两项，由下方内联脚本拦截
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no' }
      ],
      // 主题防闪烁：渲染前定下 html[data-theme]（实际生效主题，全站 CSS 用）与
      // html[data-theme-mode]（用户选择 light/dark/system，按钮图标用）；
      // localStorage 优先，无记录或记录为 system 时跟随系统
      // 禁移动端双指捏合缩放页面：iOS Safari 无视 viewport 的 user-scalable=no，需拦原生 gesture 事件；
      // touchmove 双指兜底覆盖其余浏览器。PhotoSwipe 图片预览用自家手势系统（touch-action: none），
      // 不依赖浏览器默认缩放，故不受影响
      script: [
        {
          innerHTML: `(function(){try{var m=localStorage.getItem('theme');if(m!=='light'&&m!=='dark')m='system';var d=m==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:m==='dark';var e=document.documentElement;e.dataset.theme=d?'dark':'light';e.dataset.themeMode=m}catch(x){var e=document.documentElement;e.dataset.theme='light';e.dataset.themeMode='system'}})()`,
        },
        {
          innerHTML: `(function(){var stop=function(e){e.preventDefault()};document.addEventListener('gesturestart',stop,{passive:false});document.addEventListener('gesturechange',stop,{passive:false});document.addEventListener('touchmove',function(e){if(e.touches.length>1)stop(e)},{passive:false})})()`,
        },
      ],
      link: [
        // 站点头像（webp 为主，favicon.ico 作为旧浏览器回退）
        { rel: 'icon', type: 'image/webp', href: '/favicon.webp' },
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
