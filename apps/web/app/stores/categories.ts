import { defineStore } from 'pinia'
import type { Category } from './types'
import { genId, loadList, saveList } from './storage'

const STORAGE_KEY = 'forever-admin-categories'

const DAY = 86_400_000

function slugify(name: string): string {
  const base = name.toLowerCase().trim().replace(/\s+/g, '-')
  return base || `cat-${Date.now()}`
}

function seed(): Category[] {
  const now = Date.now()
  const rows: Array<[string, string, string]> = [
    ['前端开发', 'frontend', 'Web 前端技术与实践'],
    ['后端架构', 'backend', '服务端设计与架构'],
    ['工具效率', 'tools', '开发工具与效率提升'],
    ['随笔思考', 'essays', '生活与技术的随想'],
    ['教程指南', 'tutorials', '手把手系列教程'],
  ]
  return rows.map(([name, slug, description], i) => ({
    id: `cat-${slug}`,
    name,
    slug,
    description,
    createdAt: now - (20 - i * 3) * DAY,
  }))
}

interface CategoryInput {
  name: string
  slug?: string
  description?: string
}

export const useCategoriesStore = defineStore('admin-categories', () => {
  const list = ref<Category[]>(loadList<Category>(STORAGE_KEY) ?? seed())

  function persist() {
    saveList(STORAGE_KEY, list.value)
  }

  function create(input: CategoryInput): Category {
    const cat: Category = {
      id: genId(),
      name: input.name.trim(),
      slug: input.slug?.trim() || slugify(input.name),
      description: input.description?.trim() ?? '',
      createdAt: Date.now(),
    }
    list.value.push(cat)
    persist()
    return cat
  }

  function update(id: string, input: CategoryInput) {
    const cat = list.value.find(c => c.id === id)
    if (!cat) return
    cat.name = input.name.trim()
    cat.slug = input.slug?.trim() || slugify(input.name)
    cat.description = input.description?.trim() ?? ''
    persist()
  }

  /** 删除分类，同时将引用它的文章置为未分类 */
  function remove(id: string) {
    list.value = list.value.filter(c => c.id !== id)
    persist()
    const postsStore = usePostsStore()
    postsStore.detachCategory(id)
  }

  return { list, create, update, remove }
})
