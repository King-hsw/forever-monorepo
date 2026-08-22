import { defineStore } from 'pinia'
import type { Post, PostInput } from './types'
import { genId, loadList, saveList } from './storage'
import { buildSeedPosts } from '#shared/blog-seed'

const STORAGE_KEY = 'forever-admin-posts'

export const usePostsStore = defineStore('admin-posts', () => {
  // 种子数据来自前后端共享模块（shared/blog-seed.ts），服务端路由也用它生成 sitemap / RSS
  const list = ref<Post[]>(loadList<Post>(STORAGE_KEY) ?? buildSeedPosts())

  function persist() {
    saveList(STORAGE_KEY, list.value)
  }

  function getById(id: string): Post | undefined {
    return list.value.find(p => p.id === id)
  }

  function create(input: PostInput): Post {
    const post: Post = {
      id: genId(),
      ...input,
      views: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    list.value.push(post)
    persist()
    return post
  }

  /** 更新文章内容，保留 id / views / createdAt */
  function update(id: string, input: PostInput) {
    const post = list.value.find(p => p.id === id)
    if (!post) return
    Object.assign(post, input, { updatedAt: Date.now() })
    persist()
  }

/** 详情页访问时累加阅读数 */
  function incrementViews(id: string) {
    const post = list.value.find(p => p.id === id)
    if (!post) return
    post.views += 1
    persist()
  }

  function remove(id: string) {
    list.value = list.value.filter(p => p.id !== id)
    persist()
  }

  /** 发布 / 下线切换 */
  function toggleStatus(id: string) {
    const post = list.value.find(p => p.id === id)
    if (!post) return
    post.status = post.status === 'published' ? 'draft' : 'published'
    post.updatedAt = Date.now()
    persist()
  }

  /** 分类被删除时调用：引用该分类的文章置为未分类 */
  function detachCategory(categoryId: string) {
    let changed = false
    for (const post of list.value) {
      if (post.categoryId === categoryId) {
        post.categoryId = null
        changed = true
      }
    }
    if (changed) persist()
  }

  /** 标签被删除时调用：从所有文章中移除该标签 */
  function detachTag(tagId: string) {
    let changed = false
    for (const post of list.value) {
      if (post.tagIds.includes(tagId)) {
        post.tagIds = post.tagIds.filter(t => t !== tagId)
        changed = true
      }
    }
    if (changed) persist()
  }

  return { list, getById, create, update, remove, toggleStatus, incrementViews, detachCategory, detachTag }
})
