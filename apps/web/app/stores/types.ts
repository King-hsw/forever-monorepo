export type PostStatus = 'draft' | 'published'

export interface Post {
  id: string
  title: string
  excerpt: string
  contentHtml: string
  markdown: string
  status: PostStatus
  categoryId: string | null
  tagIds: string[]
  views: number
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  createdAt: number
}

export interface Tag {
  id: string
  name: string
  createdAt: number
}

/** 文章表单提交的数据（不含 id / views / 时间戳） */
export interface PostInput {
  title: string
  excerpt: string
  contentHtml: string
  markdown: string
  status: PostStatus
  categoryId: string | null
  tagIds: string[]
}
