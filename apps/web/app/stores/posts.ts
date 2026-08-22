import { defineStore } from 'pinia'
import type { Post, PostInput } from './types'
import { genId, loadList, saveList } from './storage'

const STORAGE_KEY = 'forever-admin-posts'

const DAY = 86_400_000

function makeContent(title: string): { contentHtml: string; markdown: string } {
  const md = `# ${title}\n\n这是一篇种子示例文章，用于填充后台管理演示数据。你可以在编辑器中随意修改它。\n\n## 要点\n\n- 数据保存在浏览器 localStorage，刷新不会丢失\n- 对接真实 API 时只需替换 store 的 action\n- 富文本由 Tiptap 编辑器驱动，支持 Markdown 快捷输入\n\n> 好的工具应该让你专注于内容本身。\n`
  const html = `<h1>${title}</h1><p>这是一篇<strong>种子示例文章</strong>，用于填充后台管理演示数据。你可以在编辑器中随意修改它。</p><h2>要点</h2><ul><li>数据保存在浏览器 localStorage，刷新不会丢失</li><li>对接真实 API 时只需替换 store 的 action</li><li>富文本由 Tiptap 编辑器驱动，支持 Markdown 快捷输入</li></ul><blockquote>好的工具应该让你专注于内容本身。</blockquote>`
  return { contentHtml: html, markdown: md }
}

interface SeedRow {
  title: string
  excerpt: string
  status: 'draft' | 'published'
  categoryId: string
  tagIds: string[]
  views: number
  daysAgo: number
}

const SEED_ROWS: SeedRow[] = [
  { title: 'Nuxt 4 目录结构速览', excerpt: 'app/、server/、shared/ 各自负责什么？一文理清 Nuxt 4 的目录约定与自动导入规则。', status: 'published', categoryId: 'cat-frontend', tagIds: ['tag-2', 'tag-3'], views: 1840, daysAgo: 2 },
  { title: 'Tiptap 编辑器定制实战', excerpt: '从 StarterKit 出发，扩展行号代码块、Markdown 双向同步，打造顺手的写作环境。', status: 'published', categoryId: 'cat-frontend', tagIds: ['tag-1', 'tag-7'], views: 2310, daysAgo: 5 },
  { title: 'CSS 容器查询入门', excerpt: '告别媒体查询的局限，让组件真正响应自身容器的尺寸变化。', status: 'published', categoryId: 'cat-frontend', tagIds: ['tag-4'], views: 960, daysAgo: 8 },
  { title: 'Node.js 流式处理浅析', excerpt: 'Readable、Writable 与 Transform：用流的思想处理大文件与高并发场景。', status: 'published', categoryId: 'cat-backend', tagIds: ['tag-5'], views: 1520, daysAgo: 11 },
  { title: '用 AI 编程助手重构遗留代码', excerpt: 'AI 不是替代思考，而是放大经验。聊聊人机协作重构旧项目的实践心得。', status: 'published', categoryId: 'cat-essays', tagIds: ['tag-8'], views: 2050, daysAgo: 14 },
  { title: '前端工程化配置清单', excerpt: 'ESLint、Prettier、husky、CI……新项目开工前的检查清单，照着抄就对了。', status: 'published', categoryId: 'cat-tutorials', tagIds: ['tag-7', 'tag-1'], views: 1280, daysAgo: 18 },
  { title: '性能优化：从 Lighthouse 开始', excerpt: '先测量再优化。用 Lighthouse 定位性能瓶颈，逐步把分数刷到 90+。', status: 'draft', categoryId: 'cat-tools', tagIds: ['tag-6'], views: 320, daysAgo: 3 },
  { title: '我的 2026 开发工具箱', excerpt: '终端、编辑器、效率工具大盘点，附完整配置文件。', status: 'draft', categoryId: 'cat-tools', tagIds: ['tag-7'], views: 140, daysAgo: 1 },
]

function seed(): Post[] {
  const now = Date.now()
  return SEED_ROWS.map((row, i) => {
    const createdAt = now - row.daysAgo * DAY
    return {
      id: `post-seed-${i + 1}`,
      ...row,
      ...makeContent(row.title),
      createdAt,
      updatedAt: now - Math.max(0, row.daysAgo - 1) * DAY,
    }
  })
}

export const usePostsStore = defineStore('admin-posts', () => {
  const list = ref<Post[]>(loadList<Post>(STORAGE_KEY) ?? seed())

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

  return { list, getById, create, update, remove, toggleStatus, detachCategory, detachTag }
})
