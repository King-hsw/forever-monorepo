/**
 * 编辑器图片上传（纯前端方案）：图片在客户端压缩后转成 data URL
 * 直接内嵌进文档，离线（PWA）也能正常显示。
 *
 * 将来对接 forever-server 的上传接口时，只需把 fileToImageSrc 换成
 * `async (file) => (await fetch('/api/upload', { method: 'POST', body: formData })).json().url`
 * 之类的实现，其余逻辑不用动。
 */

/** 超过该宽度的图片会被等比缩小 */
const MAX_WIDTH = 1600

/** 允许的图片类型 */
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function isSupportedImage(file: File): boolean {
  return ACCEPTED_TYPES.has(file.type)
}

/**
 * 把图片文件转换为可直接放进 <img src> 的字符串。
 * 小图直接读为 data URL；大图先经 canvas 等比压缩再导出，
 * 避免 localStorage / 文档体积爆炸。
 */
export async function fileToImageSrc(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)

  // GIF 直接原样使用（canvas 重绘会丢动画）
  if (file.type === 'image/gif') {
    return dataUrl
  }

  const image = await loadImage(dataUrl)
  if (image.width <= MAX_WIDTH) {
    return dataUrl
  }

  return drawScaled(image, file.type)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片解码失败'))
    image.src = src
  })
}

/** 等比缩放到 MAX_WIDTH 内并导出；PNG 保留透明通道，其余导出为 JPEG 以减小体积 */
function drawScaled(image: HTMLImageElement, type: string): string {
  const scale = MAX_WIDTH / image.width
  const canvas = document.createElement('canvas')
  canvas.width = MAX_WIDTH
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  // 导出类型：JPEG 体积小但不支持透明；PNG 保透明但更大。
  // WebP 输入也导回 WebP，兼顾体积与质量。
  const exportType = type === 'image/png' || type === 'image/webp' ? type : 'image/jpeg'
  return canvas.toDataURL(exportType, 0.85)
}
