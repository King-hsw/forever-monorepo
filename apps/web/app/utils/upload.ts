import { apiFetch } from '~/utils/api'

/**
 * 上传临时文件（动态图片 / 音频 / 视频），返回服务端可访问的 URL。
 * 需登录 + moment:post 权限；失败抛 ApiError（后端按 Content-Type 白名单与大小限制校验）。
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
