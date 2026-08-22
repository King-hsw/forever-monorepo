import { defineStore } from 'pinia'
import type { Tag } from './types'
import { genId, loadList, saveList } from './storage'

const STORAGE_KEY = 'forever-admin-tags'

const DAY = 86_400_000

function seed(): Tag[] {
  const names = ['Vue', 'Nuxt', 'TypeScript', 'CSS', 'Node.js', '性能优化', '工程化', 'AI 编程']
  const now = Date.now()
  return names.map((name, i) => ({
    id: `tag-${i + 1}`,
    name,
    createdAt: now - (25 - i * 2) * DAY,
  }))
}

export const useTagsStore = defineStore('admin-tags', () => {
  const list = ref<Tag[]>(loadList<Tag>(STORAGE_KEY) ?? seed())

  function persist() {
    saveList(STORAGE_KEY, list.value)
  }

  function create(name: string): Tag {
    const tag: Tag = { id: genId(), name: name.trim(), createdAt: Date.now() }
    list.value.push(tag)
    persist()
    return tag
  }

  function update(id: string, name: string) {
    const tag = list.value.find(t => t.id === id)
    if (!tag) return
    tag.name = name.trim()
    persist()
  }

  /** 删除标签，同时从所有文章的 tagIds 中移除 */
  function remove(id: string) {
    list.value = list.value.filter(t => t.id !== id)
    persist()
    const postsStore = usePostsStore()
    postsStore.detachTag(id)
  }

  return { list, create, update, remove }
})
