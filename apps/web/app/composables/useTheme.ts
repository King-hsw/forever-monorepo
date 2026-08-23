export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'forever-theme'

/**
 * 主题管理：
 * - 持久化到 localStorage
 * - 首次访问跟随系统偏好（由 nuxt.config.ts 中的内联脚本在渲染前处理，防止闪烁）
 * - 切换时使用 View Transition API 做从点击位置扩散的圆形揭示动画，
 *   不支持该 API 的浏览器优雅降级为直接切换（配合 CSS 变量过渡）
 */
export function useTheme() {
  // SSR / 客户端共享状态：通过 <html> 上的 dark 类判断当前主题
  const isDark = useState<boolean>('theme-dark', () => false)

  const syncFromDOM = () => {
    if (import.meta.client) {
      isDark.value = document.documentElement.classList.contains('dark')
    }
  }

  const apply = (mode: ThemeMode) => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    localStorage.setItem(STORAGE_KEY, mode)
    isDark.value = mode === 'dark'
    updateThemeColorMeta(mode)
  }

  const updateThemeColorMeta = (mode: ThemeMode) => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = mode === 'dark' ? '#14161d' : '#6366f1'
  }

  /** 切换主题；传入事件对象时，动画以触发组件在页面中的位置为圆心向外扩散 */
  const toggle = async (event?: MouseEvent) => {
    if (import.meta.server) return
    syncFromDOM()

    const next: ThemeMode = isDark.value ? 'light' : 'dark'
    const doc = document.documentElement

    // 用户偏好减少动效、或浏览器不支持 View Transition：直接切换
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startViewTransition = (document as Document & {
      startViewTransition?: (cb: () => void) => {
        ready: Promise<void>
      }
    }).startViewTransition

    if (!startViewTransition || reducedMotion || document.hidden) {
      apply(next)
      return
    }

    // 在任何 await 之前同步读取圆心位置（参考 nuxt3-blog 的 changeTheme）：
    // 圆心取触发组件自身的布局中心，随组件在页面中的位置变化；
    // 拿不到组件时退回光标坐标，两者都不可用才用右上角兜底
    const target = event?.currentTarget as HTMLElement | null
    let x: number
    let y: number
    if (target) {
      const rect = target.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top + rect.height / 2
    } else if (event && (event.clientX !== 0 || event.clientY !== 0)) {
      x = event.clientX
      y = event.clientY
    } else {
      x = window.innerWidth - 48
      y = 48
    }

    const transition = startViewTransition.call(document, () => {
      apply(next)
    })

    // 等新视图就绪后，用 clip-path 圆形揭示动画展开新主题；
    // 过渡被跳过（如连续快速点击）时 ready 会 reject，直接返回即可
    try {
      await transition.ready
    } catch {
      return
    }

    // 点击位置已在上文同步捕获；半径略微超出屏幕（+10%），
    // 保证动画结束时新主题已完全覆盖画面，快照移除时不会出现可见的跳变
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    ) * 1.1

    try {
      doc.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 450,
          // 加速曲线：圆扩散越到后面越快，果断盖满屏幕，避免结尾拖沓、僵硬
          easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    } catch {
      // 个别浏览器不支持对伪元素执行动画：新快照已在上层，直接呈现即可
    }
  }

  // 客户端挂载后同步一次真实状态（内联脚本可能已设置 dark）
  if (import.meta.client) {
    syncFromDOM()
  }

  return {
    isDark: readonly(isDark),
    toggle,
  }
}
