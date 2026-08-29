import { apiFetch } from '~/utils/api'

/**
 * multipart 上传动态附件（图片 / 音频 / 视频），返回服务端正式地址。
 * 需登录 + moment:post 权限；失败抛 ApiError（后端按 Content-Type 白名单与大小限制校验）。
 * 动态发布主链路已改为 RustFS 直传（见 uploadService.ts），本函数仅作为
 * local 存储模式（不支持直传）的回退通道。
 */
export async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch<{ url: string }>('/api/admin/upload', {
    method: 'POST',
    body: form,
  })
  return res.url
}
