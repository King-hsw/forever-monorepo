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
        '/admin/**': {ssr: false},
    },
    devtools: {enabled: true},
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
    // 开发环境：浏览器发出的 /api/** 及 rss 由 devProxy 转发到后端；
    // 注意 devProxy 对 SSR 内部 $fetch 无效，SSR 靠上面的 apiBase 直连
    nitro: {
        // 构建期为 .output/public 下的静态资源（/_nuxt/* 等）预生成 .gz / .br，
        // 压缩发生在构建时，运行时零开销。
        // 注意：这只覆盖静态资源。SSR 动态 HTML 与 server routes（/sitemap.xml、
        // /robots.txt）目前不压缩——全站唯一能兜住它们的就是网关层，
        // 若后续开启上级反代（Traefik / Nginx）的 gzip，记得配好类型白名单
        compressPublicAssets: true,
        devProxy: {
            // 注意：当前 nitropack 的 devProxy 转发时会剥掉匹配的前缀（/api/），
            // 因此 target 必须带上 /api 才能还原真实路径
            '/api/': {
                target: 'http://localhost:8080/api',
                changeOrigin: true,
                // Spring Security 会校验 Origin，改写为后端自身地址以通过 CORS 校验
                headers: {origin: 'http://localhost:8080'},
            },
            '/images': {
                target: 'http://10.0.0.16:9011/blog',  // target 里带上 /blog
                changeOrigin: true,
            },
            '/rss.xml': {target: 'http://localhost:8080/rss.xml', changeOrigin: true},
            // /sitemap.xml 与 /robots.txt 改由 server/routes 动态生成（后端没有这两个接口），
            // 在此转发只会得到 404
        },
    },
    // prose.css：MarkdownView 与 TiptapEditor 共用的文章排版（所见即所得）
    // hljs-dark.css：代码高亮的深色 token 层（浅色基线是各组件引入的 highlight.js github.css）
    css: ['~/assets/css/main.css', '~/assets/css/prose.css', '~/assets/css/hljs-dark.css'],
    // @nuxt/icon 的本地图标数据接口默认挂在 /api/_nuxt_icon 下，会被网关 /api→后端的转发规则
    // 截走（后端 Spring Security 直接 401 拒绝并刷日志）；改挂到 /_nuxt_icon 避开 /api 命名空间
    modules: ['@pinia/nuxt', '@vite-pwa/nuxt', ['@nuxt/icon', {localApiEndpoint: '/_nuxt_icon'}]],
    // 图标：iconify 本地集合（@iconify-json/lucide），构建时打包、运行时不请求外网；
    // 默认 css 模式用 mask 渲染，颜色随 currentColor、大小随 font-size，与现有线性 SVG 风格一致
    pwa: {
        registerType: 'autoUpdate',
        workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,woff2}'],
            // 不能开 SPA 离线导航兜底：@vite-pwa/nuxt 未显式设置时会默认 navigateFallback: '/'，
            // 而 Nuxt 构建不产出任何可 precache 的 HTML，generateSW 会生成 SW 启动即抛
            // non-precached-url 的 NavigationRoute，连带 pages NetworkFirst 全部失效；
            // 显式置 null（workbox-build schema 允许 null）关掉 NavigationRoute
            navigateFallback: null,
            runtimeCaching: [
                {
                    // 页面导航 NetworkFirst（原 sw.ts 手写监听等价）
                    urlPattern: ({ request, url }) => request.mode === 'navigate' && url.origin === self.location.origin,
                    handler: 'NetworkFirst',
                    options: {
                        cacheName: 'pages',
                        networkTimeoutSeconds: 5,
                        // workbox-build 7.x 的键是 expiration（单对象），非 expirationPlugins 数组
                    expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
                    },
                },
            ],
        },
        manifest: {
            name: '补陋阁',
            short_name: '补陋阁',
            description: '补陋阁 —— 斯是陋室，惟吾德馨',
            start_url: '/',
            display: 'standalone',
            orientation: 'any',
            // 启动屏配色用玉墨底（--c-body-bg 暗色）：Android WebAPK 启动屏 = 图标+应用名
            // 铺在这个底色上，与 iOS 启动图同底色，避免冷启动刺眼纯白
            theme_color: '#131514',
            background_color: '#131514',
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
        devOptions: {
            enabled: true,
            navigateFallback: '/'
        }
    },
    app: {
        head: {
            meta: [
                {name: 'theme-color', content: '#ffffff'},
                // iOS standalone 模式：状态栏与页面背景同色
                {name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent'},
                // 刘海屏：页面延伸到安全区外，配合 CSS env(safe-area-inset-*) 使用
                // 禁双指捏合缩放页面：Android 靠 viewport 即可；iOS Safari 自 10 起无视这两项，由下方内联脚本拦截
                {
                    name: 'viewport',
                    content: 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no'
                }
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
                {
                    src: '//sdk.51.la/js-sdk-pro.min.js', // 引入外部JavaScript文件
                    id: 'LA_COLLECT' // 为该script标签设置id
                },
                {
                    // 直接在script标签内写入JavaScript代码
                    innerHTML: `LA.init({id:"3HoX4GzQbl1nWOb2", ck:"3HoX4GzQbl1nWOb2", autoTrack:true, hashMode:true})`
                }
            ],
            link: [
                // 站点头像（webp 为主，favicon.ico 作为旧浏览器回退）
                {rel: 'icon', type: 'image/webp', href: '/favicon.webp'},
                {rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png'},
                {rel: 'sitemap', type: 'application/xml', href: '/sitemap.xml'},
                // 不引任何外部样式表：Google Fonts 之类的外链 CSS 是渲染阻塞资源，
                // 会让首帧白白等一个对外的网络往返（PWA 冷启动白屏的主要来源之一）
            ]
        }
    }
})
