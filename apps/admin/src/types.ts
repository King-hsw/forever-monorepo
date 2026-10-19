export interface ProfileInfo {
  username: string
  avatarUrl?: string
  email?: string
}

export interface PostItem {
  id: number
  title: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface CommentItem {
  id: number
  content: string
  author: string
  postId: number
  createdAt: string
  status: string
}

export interface CategoryItem {
  id: number
  name: string
  slug: string
  articleCount: number
}

export interface TagItem {
  id: number
  name: string
  slug: string
}

export interface SettingsInfo {
  siteName: string
  siteDescription?: string
  [key: string]: unknown
}
