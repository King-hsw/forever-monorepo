import PhotoSwipe from 'photoswipe'
import 'photoswipe/style.css'

type ImageSize = { width: number; height: number }

/** 图片原始像素尺寸缓存（同一 URL 全站复用，一次量准） */
const sizeCache = new Map<string, ImageSize>()

/**
 * 取图片原始尺寸：优先读 DOM 里已加载的同源 <img>（宫格缩略 / 文章正文），
 * 否则 new Image() 异步量一次并缓存。
 * Photoswipe 拿不到 width/height 会退回视口尺寸：图片被拉伸铺满全屏、缩放级别失真。
 */
function imageSize(src: string): Promise<ImageSize | undefined> {
  const hit = sizeCache.get(src)
  if (hit)
    return Promise.resolve(hit)

  let abs = src
  try {
    abs = new URL(src, document.baseURI).href
  }
  catch {
    /* 异常 src：跳过 DOM 匹配，直接走 new Image() */
  }

  const el = Array.from(document.images).find(im => im.src === abs)
  if (el) {
    if (el.naturalWidth > 0) {
      const size = { width: el.naturalWidth, height: el.naturalHeight }
      sizeCache.set(src, size)
      return Promise.resolve(size)
    }
    // SVG 无固有尺寸：退回显示尺寸，避免被铺满拉伸
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      const size = { width: Math.round(rect.width), height: Math.round(rect.height) }
      sizeCache.set(src, size)
      return Promise.resolve(size)
    }
  }

  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const size = { width: img.naturalWidth, height: img.naturalHeight }
      if (size.width > 0 && size.height > 0) {
        sizeCache.set(src, size)
        resolve(size)
      }
      else {
        resolve(undefined)
      }
    }
    img.onerror = () => resolve(undefined)
    img.src = abs
  })
}

/**
 * 图片统一预览：页面内 PhotoSwipe 浮层（不开新页 / 新标签），
 * 默认即移动端手势：捏合缩放、双击放大、左右滑切换、下滑 / 点遮罩关闭，桌面端支持键盘与滚轮。
 *
 * @param images 同一画廊的图片 URL 列表
 * @param startIndex 起始图片下标
 * @param thumb 起始图片对应的页面缩略图元素，用于「从缩略图放大」的开场动画
 * @param thumbCropped 缩略图是否为 object-fit: cover 裁切（宫格小图），开场动画据此还原裁切
 */
export async function openPhotoPreview(
  images: string[],
  startIndex = 0,
  thumb?: HTMLElement | null,
  thumbCropped = false,
) {
  // 先量齐原始尺寸再开浮层：Photoswipe 无 width/height 的条目会按视口尺寸渲染（拉伸变形 + 捏合缩放失效）
  await Promise.all(images.map(src => imageSize(src)))

  const psw = new PhotoSwipe({
    index: startIndex,
    dataSource: images.map((src, i) => {
      const size = sizeCache.get(src)
      const item: { src: string, width?: number, height?: number, element?: HTMLElement, thumbCropped?: boolean } = {
        src,
        ...(size && { width: size.width, height: size.height }),
      }
      if (i === startIndex && thumb) {
        item.element = thumb
        item.thumbCropped = thumbCropped
      }
      return item
    }),
  })
  psw.init()
  return psw
}
