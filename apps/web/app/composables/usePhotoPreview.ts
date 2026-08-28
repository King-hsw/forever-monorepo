import PhotoSwipe from 'photoswipe'
import 'photoswipe/style.css'

/**
 * 图片统一预览：页面内 PhotoSwipe 浮层（不开新页 / 新标签），
 * 默认即移动端手势：捏合缩放、双击放大、左右滑切换、下滑 / 点遮罩关闭，桌面端支持键盘与滚轮。
 *
 * @param images 同一画廊的图片 URL 列表
 * @param startIndex 起始图片下标
 * @param thumb 起始图片对应的页面缩略图元素，用于「从缩略图放大」的开场动画
 */
export function openPhotoPreview(images: string[], startIndex = 0, thumb?: HTMLElement | null) {
  const psw = new PhotoSwipe({
    index: startIndex,
    dataSource: images.map((src, i) => (i === startIndex && thumb ? { src, element: thumb } : { src })),
  })
  psw.init()
  return psw
}
