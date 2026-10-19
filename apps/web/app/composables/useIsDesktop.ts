/**
 * 是否桌面端断点（≥901px）：左栏（SiteRail）/顶栏（SiteHeader）内互斥控件的唯一判据，
 * 保证同一控件在 DOM 中只存在一个实例。
 * SSR 时服务器拿不到视口宽度，读客户端上次回写的 ssr-width 镜像 cookie（重复访问即可命中）；
 * 首次访问（无 cookie）SSR 为移动端，客户端挂载后同步真实值。监听全局只装一次。
 */
let synced = false

export function useIsDesktop() {
  const isDesktop = useState<boolean>('is-desktop', () => {
    if (import.meta.server) {
      const m = String(useRequestHeader('cookie') ?? '').match(/(?:^|;\s*)ssr-width=(\d+)/)
      return m ? Number(m[1]) >= 901 : false
    }
    return window.matchMedia('(min-width: 901px)').matches
  })

  onMounted(() => {
    if (synced)
      return
    synced = true
    const mq = window.matchMedia('(min-width: 901px)')
    const update = () => {
      isDesktop.value = mq.matches
      // 镜像视口宽度回服务端，下次 SSR 直接渲染正确形态（避免首屏按钮闪烁）
      try {
        document.cookie = `ssr-width=${window.innerWidth}; max-age=31536000; path=/`
      }
      catch {}
    }
    update()
    mq.addEventListener('change', update)
  })

  return isDesktop
}
