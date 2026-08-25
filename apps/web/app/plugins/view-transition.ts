/**
 * 页面导航的 View Transition 揭幕：
 * Nuxt 开启 experimental.viewTransition 后，路由切换自带默认交叉淡化；
 * 这里接管动画——新页面从最近一次点击的位置以圆形墨晕向外扩散揭开。
 * 用户偏好减少动效时不做自定义动画，回落到浏览器默认表现。
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  // 记录最近一次点击位置；键盘/脚本跳转时退回视口中央偏上
  let x = window.innerWidth / 2
  let y = window.innerHeight / 3
  window.addEventListener(
    'click',
    (e) => {
      x = e.clientX
      y = e.clientY
    },
    { passive: true },
  )

  nuxtApp.hooks.hook('page:view-transition:start', (transition) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) return

    transition.ready
      .then(() => {
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) * 1.1
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 280,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => {})
  })
})
