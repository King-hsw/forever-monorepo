export type ThemeMode = 'light' | 'dark'

/** 系统偏好变化的监听只需注册一次 */
let watcherInstalled = false

/**
 * 深浅色主题：显式选择存 localStorage，无记录跟随系统。
 * html[data-theme] 由 head 内联脚本在渲染前先行写入（防首屏闪烁），
 * 本 composable 负责运行时切换与状态同步。
 */
export function useTheme() {
  const theme = useState<ThemeMode>('theme', () => 'light')

  function apply(next: ThemeMode) {
    theme.value = next
    document.documentElement.dataset.theme = next
  }

  function persist(next: ThemeMode) {
    try {
      localStorage.setItem('theme', next)
    }
    catch {}
  }

  /**
   * 切换主题。支持 View Transition 且未要求减少动效时，
   * 按 transition.css 的 custom 思路做圆形揭示：动画参数（圆心/半径）
   * 走 CSS 自定义属性传给 main.css 里的 theme-circle-in keyframes，
   * 新主题快照用 clip-path 从点击处展开盖满全屏。
   */
  function toggle(event?: MouseEvent) {
    const next: ThemeMode = theme.value === 'dark' ? 'light' : 'dark'
    persist(next)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reducedMotion) {
      apply(next)
      return
    }

    const root = document.documentElement
    // 键盘激活的 click 没有坐标（clientX 为 0），退回屏幕中心
    const hasPoint = !!event && event.detail > 0
    const x = hasPoint ? event!.clientX : window.innerWidth / 2
    const y = hasPoint ? event!.clientY : window.innerHeight / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    root.style.setProperty('--tx-x', `${x}px`)
    root.style.setProperty('--tx-y', `${y}px`)
    root.style.setProperty('--tx-r', `${radius}px`)

    // 门控属性让圆形揭示只作用于本次过渡，不干扰页面导航的 View Transition
    root.dataset.themeTransition = ''
    const viewTransition = document.startViewTransition(() => apply(next))
    viewTransition.finished.finally(() => {
      delete root.dataset.themeTransition
    })
  }

  /** 挂载后从 html[data-theme] 读回内联脚本定下的真实主题，并跟随系统偏好变化 */
  function initTheme() {
    const fromDom = document.documentElement.dataset.theme as ThemeMode | undefined
    if (fromDom === 'dark' || fromDom === 'light')
      theme.value = fromDom

    if (watcherInstalled)
      return
    watcherInstalled = true
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // 用户显式选过主题后不再跟随系统
      if (!localStorage.getItem('theme'))
        apply(e.matches ? 'dark' : 'light')
    })
  }

  return { theme, toggle, initTheme }
}
