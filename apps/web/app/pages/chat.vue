<template>
  <div class="chat-page">
    <div class="chat">
      <!-- 成员面板：桌面常驻，移动端抽屉 -->
      <aside
        class="members"
        :class="{ 'members--open': membersOpen }"
        aria-label="成员列表"
      >
        <div class="members__head">
          <span>成员</span>
          <span class="members__count">{{ members.length }}</span>
        </div>
        <ul class="members__list">
          <li v-for="m in members" :key="m.nickname">
            <button
              type="button"
              class="member"
              :class="{ 'member--active': filterMember === m.nickname }"
              @click="selectMember(m)"
            >
              <SafeImage
                class="member__avatar"
                :src="m.avatarUrl"
                :alt="m.nickname"
                variant="avatar"
                width="38"
                height="38"
              />
              <span class="member__body">
                <span class="member__name">
                  {{ m.nickname }}
                  <em v-if="isSelfName(m.nickname)" class="member__me">我</em>
                </span>
                <span class="member__preview">{{ m.lastContent }}</span>
              </span>
              <time class="member__time">{{ fmtRel(m.lastAt) }}</time>
            </button>
          </li>
        </ul>
        <p v-if="!members.length" class="members__empty">
          还没有成员，来打个招呼吧。
        </p>
      </aside>
      <div
        v-if="membersOpen"
        class="members__backdrop"
        aria-hidden="true"
        @click="membersOpen = false"
      />

      <!-- 聊天室 -->
      <section class="room">
        <header class="room__head">
          <button
            type="button"
            class="room__members-btn"
            aria-label="查看成员"
            @click="membersOpen = true"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          <div class="room__title-wrap">
            <h1 class="room__title">{{ board?.title || '留言板' }}</h1>
            <p class="room__meta">{{ members.length }} 位成员 · {{ visibleMsgs.length }} 条消息</p>
          </div>
          <div v-if="filterMember" class="room__filter">
            <span>只看 <strong>{{ filterMember }}</strong> 的发言</span>
            <button type="button" aria-label="查看全部" @click="clearFilter">×</button>
          </div>
        </header>

        <div ref="scrollEl" class="msgs" role="log" aria-live="polite">
          <div v-if="loading" class="msgs__state">加载中…</div>
          <div v-else-if="loadError" class="msgs__state">
            <p>消息加载失败</p>
            <button type="button" class="msgs__retry" @click="load">重试</button>
          </div>
          <div v-else-if="!rows.length" class="msgs__state">
            <span class="msgs__face" aria-hidden="true">(˘•ω•˘)</span>
            <p>{{ board?.summary || '对网站有任何建议、想法，或者只是想打个招呼，都欢迎在这里留言。' }}</p>
          </div>
          <template v-else>
            <template v-for="row in rows">
              <div v-if="row.kind === 'sep'" :key="row.key" class="sep">
                <span>{{ row.text }}</span>
              </div>
              <div
                v-else
                :key="row.key"
                class="msg"
                :class="{ 'msg--self': row.self, 'msg--flash': flashKey === row.key }"
                :data-mid="row.msg.id"
              >
                <!-- 头像加载失败时渲染首字占位（SafeImage），样式由 member__avatar 同款类提供 -->
                <SafeImage
                  v-if="!row.self"
                  class="msg__avatar"
                  :src="row.msg.avatarUrl"
                  :alt="row.msg.nickname"
                  variant="avatar"
                  width="40"
                  height="40"
                />
                <div class="msg__col">
                  <span v-if="!row.self && row.showName" class="msg__name">{{ row.msg.nickname }}</span>
                  <div class="msg__bubble" title="回复 {{ row.msg.nickname }}" @click="setReplyTo(row.msg)">
                    <button
                      v-if="row.quote"
                      type="button"
                      class="msg__quote"
                      title="查看被引用的消息"
                      @click.stop="focusMessage(row.quote!.id)"
                    >
                      <span class="msg__quote-name">{{ row.quote.name }}：</span>{{ row.quote.content }}
                    </button>
                    {{ row.msg.content }}
                  </div>
                </div>
                <SafeImage
                  v-if="row.self"
                  class="msg__avatar"
                  :src="row.msg.avatarUrl"
                  :alt="row.msg.nickname"
                  variant="avatar"
                  width="40"
                  height="40"
                />
              </div>
            </template>
          </template>
        </div>

        <!-- 发送区 -->
        <footer class="composer">
          <p v-if="identity" class="composer__as">
            以 <strong>{{ identity.name }}</strong> 的身份发言
            <NuxtLink v-if="!auth.isAuthenticated" to="/guest" class="composer__link">换身份</NuxtLink>
            <span aria-hidden="true"> · </span>Enter 发送，Shift+Enter 换行
          </p>
          <p v-else class="composer__as">
            发言需先注册<NuxtLink to="/guest?redirect=/chat" class="composer__link">游客身份</NuxtLink>
          </p>
          <div v-if="replyTo" class="composer__reply">
            <span class="composer__reply-text">
              回复 <strong>{{ replyTo.nickname }}</strong>：{{ replyTo.content }}
            </span>
            <button type="button" class="composer__reply-close" aria-label="取消回复" @click="replyTo = null">×</button>
          </div>
          <div class="composer__row">
            <textarea
              v-model="draft"
              class="composer__input"
              rows="2"
              placeholder="说点什么…"
              @keydown.enter.exact="onEnter"
            />
            <button type="button" class="composer__send" :disabled="!draft.trim() || sending" @click="send">
              发送
            </button>
          </div>
          <p v-if="notice" class="composer__notice" aria-live="polite">{{ notice }}</p>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommentNode, PageResult } from '#shared/types'
import { apiFetch } from '~/utils/api'
import { formatRelativeTime, formatShortDateTime } from '~/utils/format'

interface BoardInfo {
  title: string
  summary: string
}

interface ChatMsg {
  id: number
  parentId: number | null
  nickname: string
  avatarUrl: string
  site: string | null
  content: string
  createdAt: string
}

interface Member {
  nickname: string
  avatarUrl: string
  lastAt: string
  lastContent: string
  count: number
}

/** 引用块：被回复的消息（QQ/微信风） */
interface Quote {
  id: number
  name: string
  content: string
}

/** 渲染行：时间分隔 / 消息 */
type Row =
  | { kind: 'sep'; key: string; text: string }
  | { kind: 'msg'; key: number; msg: ChatMsg; self: boolean; showName: boolean; quote: Quote | null }

const PAGE_SIZE = 100
const MAX_PAGES = 30
/** 间隔超过 5 分钟的消息之间插入时间分隔（QQ 群聊风） */
const GAP_MS = 5 * 60 * 1000

const comments = useCommentsStore()
const auth = useAuthStore()
auth.hydrate()

const board = ref<BoardInfo | null>(null)
const loading = ref(true)
const loadError = ref(false)
const msgs = ref<ChatMsg[]>([])
const scrollEl = ref<HTMLElement | null>(null)
const membersOpen = ref(false)
const flashKey = ref<number | null>(null)
/** 只看某个成员的发言（null = 全员） */
const filterMember = ref<string | null>(null)

/* ---------- 身份：后台登录优先，其次游客身份（/guest 页注册，localStorage 持久化） ---------- */

// ponytail: 登录态邮箱 mock，后端 /api/admin/me 返回真实邮箱后替换
const MOCK_OWNER_EMAIL = '1125030435@qq.com'

const guest = useGuestStore()
guest.hydrate()

/** 当前发言身份：后台登录账号优先，其次游客身份；null = 尚未注册 */
const identity = computed(() =>
  auth.isAuthenticated
    ? { name: auth.username ?? '站长', email: MOCK_OWNER_EMAIL, site: '' }
    : guest.isRegistered
      ? { name: guest.nickname, email: guest.email, site: guest.site }
      : null,
)

function isSelfName(nickname: string) {
  return !!identity.value && nickname !== '' && nickname === identity.value.name
}

onMounted(() => {
  void load()
})

/* ---------- 数据加载 ---------- */

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [info, all] = await Promise.all([
      apiFetch<BoardInfo>('/api/v1/board').catch(() => null),
      loadAllMessages(),
    ])
    board.value = info
    msgs.value = all
    await nextTick()
    scrollToBottom(false)
  }
  catch {
    loadError.value = true
  }
  finally {
    loading.value = false
  }
}

function toMsg(n: CommentNode): ChatMsg {
  // 留言板评论邮箱必填，avatarUrl 实际恒有值；类型上兼容动态评论的空头像
  return {
    id: n.id,
    parentId: n.parentId ?? null,
    nickname: n.nickname,
    avatarUrl: n.avatarUrl ?? '',
    site: n.site,
    content: n.content,
    createdAt: n.createdAt,
  }
}

/** 留言板拉满所有页（个人博客量级，一次拉完最简单） */
async function loadAllMessages(): Promise<ChatMsg[]> {
  const out: ChatMsg[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res: PageResult<CommentNode> = await comments.fetchBoardMessages(page, PAGE_SIZE)
    for (const root of res.list) {
      out.push(toMsg(root))
      for (const reply of root.replies ?? [])
        out.push(toMsg(reply))
    }
    if (res.list.length < PAGE_SIZE || page * PAGE_SIZE >= res.total) break
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/* ---------- 群成员：按昵称聚合，最近发言在前 ---------- */

const members = computed<Member[]>(() => {
  const map = new Map<string, Member>()
  for (const m of msgs.value) {
    const cur = map.get(m.nickname)
    if (!cur) {
      map.set(m.nickname, {
        nickname: m.nickname,
        avatarUrl: m.avatarUrl,
        lastAt: m.createdAt,
        lastContent: m.content,
        count: 1,
      })
    }
    else {
      cur.count++
      if (m.createdAt > cur.lastAt) {
        cur.lastAt = m.createdAt
        cur.lastContent = m.content
        cur.avatarUrl = m.avatarUrl
      }
    }
  }
  return [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
})

/* ---------- 聊天时间线：根留言 + 回复按时间摊平，群聊流 ---------- */

/** 时间线可见消息：按选中成员过滤 */
const visibleMsgs = computed(() =>
  filterMember.value
    ? msgs.value.filter(m => m.nickname === filterMember.value)
    : msgs.value,
)

const rows = computed<Row[]>(() => {
  // 引用查找用全量（过滤视图里引用的可能是不在场的人）
  const byId = new Map(msgs.value.map(m => [m.id, m]))
  const out: Row[] = []
  let lastT = 0
  let lastName = ''
  for (const m of visibleMsgs.value) {
    const t = new Date(m.createdAt).getTime()
    if (t - lastT > GAP_MS)
      out.push({ kind: 'sep', key: `sep-${m.id}`, text: fmtSep(m.createdAt) })
    const self = isSelfName(m.nickname)
    const parent = m.parentId ? byId.get(m.parentId) : undefined
    out.push({
      kind: 'msg',
      key: m.id,
      msg: m,
      self,
      showName: !self && m.nickname !== lastName,
      quote: parent
        ? { id: parent.id, name: parent.nickname, content: parent.content }
        : null,
    })
    lastT = t
    lastName = m.nickname
  }
  return out
})

function selectMember(member: Member) {
  // 再点一次当前选中成员 = 取消过滤
  filterMember.value = filterMember.value === member.nickname ? null : member.nickname
  membersOpen.value = false
  scrollToFiltered()
}

function clearFilter() {
  filterMember.value = null
  scrollToFiltered()
}

/** 过滤视图从最早的消息看起，恢复全员则回到最新消息 */
function scrollToFiltered() {
  nextTick(() => {
    const el = scrollEl.value
    if (!el) return
    if (filterMember.value)
      el.scrollTo({ top: 0 })
    else
      scrollToBottom()
  })
}

/** 滚动定位到指定消息并闪烁提示（引用回跳） */
function focusMessage(id: number) {
  const target = msgs.value.find(m => m.id === id)
  // 引用目标被当前过滤挡住时，先回到全员视图
  if (filterMember.value && target && target.nickname !== filterMember.value)
    filterMember.value = null
  membersOpen.value = false
  nextTick(() => {
    document
      .querySelector(`.msg[data-mid="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    flashKey.value = id
    setTimeout(() => {
      if (flashKey.value === id) flashKey.value = null
    }, 1600)
  })
}

function scrollToBottom(smooth = true) {
  const el = scrollEl.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

/* ---------- 发送 ---------- */

/** 正在回复的消息（null = 发新帖） */
const replyTo = ref<ChatMsg | null>(null)
const draft = ref('')
const sending = ref(false)
const notice = ref('')

function setReplyTo(msg: ChatMsg) {
  // 再点一次取消
  replyTo.value = replyTo.value?.id === msg.id ? null : msg
}

function onEnter(e: KeyboardEvent) {
  // 中文输入法组词中的 Enter 不发送（也不能 preventDefault，否则会吞掉候选词确认）
  if (e.isComposing) return
  e.preventDefault()
  void send()
}

async function send() {
  const content = draft.value.trim()
  if (!content || sending.value) return
  if (!identity.value) {
    // 尚未注册游客身份：先去注册，保存后自动回聊天页
    await navigateTo({ path: '/guest', query: { redirect: '/chat' } })
    return
  }
  sending.value = true
  notice.value = ''
  try {
    const created = await comments.create({
      targetType: 'BOARD',
      nickname: identity.value.name,
      email: identity.value.email,
      site: identity.value.site || undefined,
      content,
      parentId: replyTo.value?.id,
    })
    draft.value = ''
    replyTo.value = null
    if (created.status === 'APPROVED') {
      // 创建接口不返回头像等完整字段，静默刷新整列表保持数据一致
      msgs.value = await loadAllMessages()
      await nextTick()
      scrollToBottom()
    }
    else {
      notice.value = '已发送，消息审核后出现在群聊中'
    }
  }
  catch (e) {
    notice.value = e instanceof Error ? e.message : '发送失败，请稍后再试'
  }
  finally {
    sending.value = false
  }
}

/* ---------- 时间格式 ---------- */

// 时间展示统一走 utils/format（动态页同款）
const fmtRel = formatRelativeTime
const fmtSep = formatShortDateTime

usePageSeo({
  title: computed(() => `${board.value?.title || '留言板'} · 聊天 - 补陋阁`),
  description: computed(() =>
    board.value?.summary || '补陋阁的留言板聊天群 —— 大家在这里畅所欲言。',
  ),
  path: '/chat',
})
</script>

<style scoped>
.chat-page {
  /* 微信/QQ 式满视口布局：布局层已为刘海下移安全区高度（app-shell__body padding-top），
     这里减去同值恰好占满视口，页面级不产生滚动，滚动只发生在消息列表内 */
  height: calc(100dvh - var(--safe-area-inset-top));
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.chat {
  flex: 1;
  display: flex;
  min-height: 0;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* ===== 成员面板 ===== */

.members {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 250px;
  min-height: 0;
  border-right: 1px solid var(--c-border);
  background: var(--c-bg-soft);
}

.members__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-secondary);
}

.members__count {
  padding: 1px 8px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--c-text-muted);
  background: var(--c-bg-card);
  border-radius: 999px;
}

.members__list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 8px 12px;
  margin: 0;
  list-style: none;
  overflow-y: auto;
}

.member {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  font: inherit;
  text-align: left;
  color: inherit;
  background: none;
  border: none;
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

@media (hover: hover) and (pointer: fine) {
  .member:hover {
    background: var(--c-bg-card);
  }
}

.member:active {
  transition-duration: 80ms;
  transform: scale(0.98);
}

.member--active {
  background: color-mix(in srgb, var(--c-primary) 10%, var(--c-bg-card));
}

.member--active .member__name {
  color: var(--c-primary);
}

.member__avatar {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  /* 头像加载失败时的首字占位（SafeImage 复用此 class）；background 也作图片加载中的底色 */
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-on-primary);
  background: var(--c-primary);
}

.member__body {
  flex: 1;
  min-width: 0;
}

.member__name {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--c-text);
  white-space: nowrap;
}

.member__me {
  padding: 0 5px;
  font-size: 10.5px;
  font-style: normal;
  color: var(--c-on-primary);
  background: var(--c-primary);
  border-radius: 999px;
}

.member__preview {
  display: block;
  font-size: 12.5px;
  color: var(--c-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member__time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--c-text-muted);
}

.members__empty {
  margin: auto;
  padding: 24px 16px;
  font-size: 13px;
  color: var(--c-text-muted);
  text-align: center;
}

.members__backdrop {
  display: none;
}

/* ===== 聊天室 ===== */

.room {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: color-mix(in srgb, var(--c-bg-soft) 65%, var(--c-bg-card));
}

.room__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg-card);
}

.room__title-wrap {
  min-width: 0;
}

.room__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  color: var(--c-text);
}

.room__meta {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--c-text-muted);
}

.room__filter {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
  padding: 4px 6px 4px 12px;
  font-size: 12px;
  color: var(--c-text-secondary);
  background: color-mix(in srgb, var(--c-primary) 10%, var(--c-bg-card));
  border-radius: 999px;
}

.room__filter strong {
  font-weight: 600;
  color: var(--c-primary);
}

.room__filter button {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  line-height: 1;
  color: var(--c-text-muted);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.room__filter button:hover {
  color: var(--c-text);
}

.room__members-btn {
  display: none;
}

/* ===== 消息流 ===== */

.msgs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 20px 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.msgs__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: auto;
  max-width: 420px;
  color: var(--c-text-muted);
  text-align: center;
}

.msgs__state p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}

.msgs__face {
  font-size: 34px;
}

.msgs__retry {
  padding: 6px 20px;
  font: inherit;
  font-size: 13px;
  color: var(--c-on-primary);
  background: var(--c-primary);
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.sep {
  display: flex;
  justify-content: center;
}

.sep span {
  padding: 2px 10px;
  font-size: 11.5px;
  color: var(--c-text-muted);
  background: color-mix(in srgb, var(--c-bg-card) 60%, transparent);
  border-radius: 999px;
}

.msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 78%;
}

.msg--self {
  margin-left: auto;
}

.msg__avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  /* 头像加载失败时的首字占位（SafeImage 复用此 class）；background 也作图片加载中的底色 */
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--c-on-primary);
  background: var(--c-primary);
}

.msg__col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.msg--self .msg__col {
  align-items: flex-end;
}

.msg__name {
  padding: 0 4px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.msg__bubble {
  padding: 9px 13px;
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--c-text);
  background: var(--c-bg-card);
  border-radius: 14px 14px 14px 4px;
  box-shadow: 0 1px 2px rgb(28 25 23 / 5%);
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.msg__quote {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 0 0 6px;
  padding: 4px 8px 4px 7px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-text-muted);
  text-align: left;
  white-space: normal;
  background: color-mix(in srgb, var(--c-text) 5%, transparent);
  border-left: 3px solid color-mix(in srgb, var(--c-text-muted) 35%, transparent);
  border-radius: 6px;
  cursor: pointer;
}

.msg__quote:hover {
  color: var(--c-text-secondary);
}

.msg__quote-name {
  font-weight: 600;
  color: var(--c-text-secondary);
}

.msg--self .msg__bubble {
  border-radius: 14px 14px 4px 14px;
}

.msg--flash .msg__bubble {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 35%, transparent);
}

/* ===== 发送区 ===== */

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--c-border);
  background: var(--c-bg-card);
}

.composer__as {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-muted);
}

.composer__link {
  color: var(--c-primary);
  font-weight: 600;
  text-decoration: none;
}

.composer__link:hover {
  text-decoration: underline;
}

.composer__reply {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 10px;
  font-size: 12.5px;
  color: var(--c-text-secondary);
  background: var(--c-bg-soft);
  border-radius: 8px;
}

.composer__reply-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer__reply-text strong {
  font-weight: 600;
  color: var(--c-text);
}

.composer__reply-close {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 18px;
  height: 18px;
  font-size: 14px;
  line-height: 1;
  color: var(--c-text-muted);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.composer__reply-close:hover {
  color: var(--c-text);
}

.composer__row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.composer__input {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  color: var(--c-text);
  background: transparent;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-control);
}

.composer__input:focus-visible {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 15%, transparent);
}

.composer__send {
  flex-shrink: 0;
  padding: 9px 24px;
  font: inherit;
  font-size: 13.5px;
  color: var(--c-on-primary);
  background: var(--c-primary);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease;
}

.composer__send:hover {
  background: var(--c-primary-hover);
}

.composer__send:active {
  transform: scale(0.95);
}

.composer__send:disabled {
  opacity: 0.5;
  cursor: default;
}

.composer__notice {
  margin: 0;
  font-size: 12px;
  color: var(--c-warning-text);
}

/* ===== 移动端：成员抽屉 + 让位顶栏 ===== */

@media (max-width: 900px) {
  .chat-page {
    padding-top: 72px;
  }

  .room__members-btn {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    color: var(--c-text-secondary);
    background: none;
    border: 1px solid var(--c-border);
    border-radius: 50%;
    cursor: pointer;
  }

  .members {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 40;
    width: min(320px, 84vw);
    transform: translateX(-105%);
    transition: transform 0.28s var(--ease-bounce);
    border-right: none;
    border-radius: 0;
    background: var(--c-bg-card);
    box-shadow: var(--shadow-card-hover);
  }

  .members--open {
    transform: none;
  }

  .members__backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 39;
    background: rgb(28 25 23 / 35%);
  }
}

/* 手机端（Tab Bar 出现区间）：发送区抬到悬浮 Tab Bar 上方。
   border-box 下总高不变，整页仍恰好视口高；布局层此页已让出 padding-bottom，
   让位由这里接管，页面级保持零滚动 */
@media (max-width: 640px) {
  .chat-page {
    padding-bottom: calc(var(--tabbar-space) + var(--safe-area-inset-bottom));
  }
}
</style>
