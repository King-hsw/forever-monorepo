export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/** 三态循环顺序：浅色 → 深色 → 跟随系统 */
const MODE_ORDER: ThemeMode[] = ['light', 'dark', 'system']

const NEXT_LABEL: Record<ThemeMode, string> = {
  light: '切换到深色模式',
  dark: '切换为跟随系统',
  system: '切换到浅色模式',
}

/** 系统偏好变化的监听只需注册一次 */
let watcherInstalled = false

function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode !== 'system')
    return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 深浅色主题，三态：浅色 / 深色 / 跟随系统。
 * 用户选择存 localStorage（键 theme），html[data-theme] 写实际生效主题（全站 CSS 令牌用），
 * html[data-theme-mode] 写用户选择（按钮图标显隐用）。两者都由 head 内联脚本渲染前先行写入（防首屏闪烁）。
 */
export function useTheme() {
  const mode = useState<ThemeMode>('theme-mode', () => 'system')
  const resolved = useState<ResolvedTheme>('theme-resolved', () => 'light')

  /** 下一次点击将进入的模式的提示文案 */
  const nextLabel = computed(() => NEXT_LABEL[mode.value])

  function apply(nextMode: ThemeMode, nextResolved: ResolvedTheme) {
    mode.value = nextMode
    resolved.value = nextResolved
    document.documentElement.dataset.themeMode = nextMode
    document.documentElement.dataset.theme = nextResolved
  }

  function persist(nextMode: ThemeMode) {
    try {
      localStorage.setItem('theme', nextMode)
    }
    catch {}
  }

  /**
   * 循环切换三态。实际主题变化时按 transition.css 的 custom 思路做圆形揭示：
   * 动画参数（圆心/半径）走 CSS 自定义属性传给 main.css 里的 theme-circle-in keyframes；
   * 实际主题没变（如浅色 ⇄ 跟随系统但系统本就浅色）则只转图标，不放全屏动画。
   */
  function setNext(event?: MouseEvent) {
    const nextMode = MODE_ORDER[(MODE_ORDER.indexOf(mode.value) + 1) % MODE_ORDER.length]!
    persist(nextMode)

    const nextResolved = resolveMode(nextMode)
    if (nextResolved === resolved.value) {
      apply(nextMode, nextResolved)
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reducedMotion) {
      apply(nextMode, nextResolved)
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
    const viewTransition = document.startViewTransition(() => apply(nextMode, nextResolved))
    viewTransition.finished.finally(() => {
      delete root.dataset.themeTransition
    })
  }

  /**
   * 挂载后从 html[data-theme]/[data-theme-mode] 读回内联脚本定下的真实状态，
   * mode 为跟随系统时监听系统偏好变化实时切换（全局只装一次监听）。
   */
  function initTheme() {
    const dom = document.documentElement.dataset
    if (dom.theme === 'dark' || dom.theme === 'light')
      resolved.value = dom.theme
    if (dom.themeMode === 'dark' || dom.themeMode === 'light' || dom.themeMode === 'system')
      mode.value = dom.themeMode

    if (watcherInstalled)
      return
    watcherInstalled = true
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // 仅跟随系统态响应系统切换；显式选择不受影响
      if (mode.value !== 'system')
        return
      apply('system', e.matches ? 'dark' : 'light')
    })
  }

  return { mode, resolved, nextLabel, setNext, initTheme }
}
