/**
 * 是否桌面端断点（≥901px）：左栏（SiteRail）/顶栏（SiteHeader）内互斥控件的唯一判据，
 * 保证同一控件在 DOM 中只存在一个实例。
 * SSR 恒为移动端（false），客户端挂载后同步真实值；useState 模块级共享，监听全局只装一次。
 */
let synced = false

export function useIsDesktop() {
  const isDesktop = useState<boolean>('is-desktop', () => false)

  onMounted(() => {
    if (synced)
      return
    synced = true
    const mq = window.matchMedia('(min-width: 901px)')
    const update = () => {
      isDesktop.value = mq.matches
    }
    update()
    mq.addEventListener('change', update)
  })

  return isDesktop
}
