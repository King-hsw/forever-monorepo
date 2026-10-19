/**
 * Escape 键关闭弹层的统一监听，组件卸载时自动移除。
 * handler 里自行判断弹层是否打开。
 */
export function useOnEscape(handler: () => void) {
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handler()
  }
  onMounted(() => document.addEventListener('keydown', onKeydown))
  onUnmounted(() => document.removeEventListener('keydown', onKeydown))
}
