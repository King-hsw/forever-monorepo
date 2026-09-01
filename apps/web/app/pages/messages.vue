<template>
  <div class="messages-page">
    <main class="messages-main">
      <header class="messages-head">
        <h1 class="messages-head__title">消息</h1>
        <p class="messages-head__sub">Messages · 站内通知，按时间倒序</p>
      </header>

      <p v-if="!auth.isAuthenticated" class="messages-state">
        请先
        <NuxtLink to="/admin/login" class="messages-link">登录</NuxtLink>
        查看消息
      </p>
      <template v-else>
        <div class="messages-bar">
          <button
            v-if="unread > 0"
            type="button"
            class="btn btn--primary"
            :disabled="busy"
            @click="readAll"
          >
            全部已读
          </button>
        </div>

        <p v-if="loading" class="messages-state">加载中…</p>
        <p v-else-if="!list.length" class="messages-state">暂无消息</p>
        <ul v-else class="messages-list">
          <li
            v-for="m in list"
            :key="m.id"
            class="messages-item"
            :class="{ 'messages-item--unread': !m.isRead }"
            @click="open(m)"
          >
            <span v-if="!m.isRead" class="messages-item__dot" aria-hidden="true" />
            <p class="messages-item__content">{{ m.content }}</p>
            <div class="messages-item__meta">
              <time>{{ formatDateTime(m.createdAt) }}</time>
              <button
                type="button"
                class="messages-item__del"
                aria-label="删除"
                title="删除"
                @click.stop="remove(m)"
              >
                <Icon name="lucide:trash-2" mode="svg" :size="14" />
              </button>
            </div>
          </li>
        </ul>

        <nav v-if="totalPages > 1" class="messages-pager" aria-label="消息分页">
          <button type="button" class="btn messages-pager-btn" :disabled="page <= 1 || loading" @click="load(page - 1)">
            <Icon name="lucide:chevron-left" /> 上一页
          </button>
          <span class="messages-pager-info">{{ page }} / {{ totalPages }}</span>
          <button type="button" class="btn messages-pager-btn" :disabled="page >= totalPages || loading" @click="load(page + 1)">
            下一页 <Icon name="lucide:chevron-right" />
          </button>
        </nav>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { MessageItem, PageResult, UnreadCount } from '#shared/types'

useSeoMeta({ title: '消息 · 补陋阁' })

const auth = useAuthStore()
const { count: unread, refresh: refreshUnread } = useUnread()

const SIZE = 20
const page = ref(1)
const list = ref<MessageItem[]>([])
const total = ref(0)
const loading = ref(false)
const busy = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / SIZE)))

async function load(targetPage = page.value) {
  if (!auth.isAuthenticated) return
  loading.value = true
  try {
    const data = await apiFetch<PageResult<MessageItem>>('/api/v1/messages', {
      query: cleanQuery({ page: targetPage, size: SIZE }),
    })
    page.value = data.page
    total.value = data.total
    list.value = data.list
  }
  catch (err) {
    alert(errMsg(err))
  }
  finally {
    loading.value = false
  }
}

/** 点击消息：置已读并跳转到来源（含 #comment-x 锚点） */
async function open(m: MessageItem) {
  if (!m.isRead) {
    m.isRead = true
    try {
      await apiFetch(`/api/v1/messages/${m.id}/read`, { method: 'PUT' })
    }
    catch { /* 已读失败不阻塞跳转 */ }
    refreshUnread()
  }
  navigateTo(m.sourceUrl)
}

async function readAll() {
  busy.value = true
  try {
    await apiFetch('/api/v1/messages/read-all', { method: 'PUT' })
    list.value.forEach(m => {
      m.isRead = true
    })
    refreshUnread()
  }
  catch (err) {
    alert(errMsg(err))
  }
  finally {
    busy.value = false
  }
}

async function remove(m: MessageItem) {
  try {
    await apiFetch(`/api/v1/messages/${m.id}`, { method: 'DELETE' })
    list.value = list.value.filter(x => x.id !== m.id)
    total.value--
    refreshUnread()
  }
  catch (err) {
    alert(errMsg(err))
  }
}

onMounted(() => load())
</script>

<style scoped>
.messages-main {
  max-width: 720px;
  margin: 0 auto;
  padding: 96px 24px 64px;
}

.messages-head__title {
  margin: 0;
  font-size: 28px;
}

.messages-head__sub {
  margin: 6px 0 0;
  color: var(--c-text-secondary);
  font-size: 14px;
}

.messages-state {
  padding: 48px 0;
  color: var(--c-text-secondary);
  text-align: center;
}

.messages-link {
  color: var(--c-primary);
  text-decoration: none;
}

.messages-link:hover {
  text-decoration: underline;
}

.messages-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.messages-item {
  position: relative;
  padding: 14px 16px;
  cursor: pointer;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.messages-item:hover {
  border-color: var(--c-primary);
}

.messages-item--unread {
  box-shadow: inset 3px 0 0 var(--c-primary);
}

.messages-item__dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 8px;
  background: var(--c-primary);
  border-radius: 50%;
  vertical-align: middle;
}

.messages-item__content {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.6;
  word-break: break-word;
}

.messages-item__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: var(--c-text-secondary);
  font-size: 12.5px;
}

.messages-item__del {
  margin-left: auto;
  padding: 2px;
  color: var(--c-text-secondary);
  cursor: pointer;
  background: none;
  border: none;
  opacity: 0;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.messages-item:hover .messages-item__del {
  opacity: 1;
}

.messages-item__del:hover {
  color: var(--c-danger);
}

/* 分页沿用全站 .btn 胶囊语言，只收窄尺寸 */
.messages-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

.messages-pager-btn {
  padding: 6px 14px;
  font-size: 13px;
}

.messages-pager-info {
  color: var(--c-text-secondary);
  font-size: 13px;
}
</style>
