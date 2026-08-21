<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Tiptap × Markdown</h1>
      <div class="page__actions">
        <button type="button" @click="content = defaultContent">恢复示例内容</button>
        <button type="button" @click="content = ''">清空</button>
      </div>
    </header>

    <div class="page__panes">
      <!-- 左：Tiptap 富文本编辑 -->
      <section class="pane pane--editor">
        <TiptapEditor v-model="content" v-model:markdown="markdown" fluid />
      </section>

      <!-- 右：Markdown 源码 + 渲染 -->
      <section class="pane pane--markdown">
        <div class="pane__section">
          <div class="pane__label">Markdown 源码</div>
          <div class="pane__body">
            <pre v-if="markdown" class="md-source">{{ markdown }}</pre>
            <p v-else class="md-empty">（暂无内容）</p>
          </div>
        </div>
        <div class="pane__section">
          <div class="pane__label">渲染</div>
          <div class="pane__body pane__body--preview">
            <MarkdownView :source="markdown" />
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
const STORAGE_KEY = 'forever-tiptap-content'

const defaultContent = `
<p>欢迎使用 <strong>Tiptap</strong> 编辑器！🎉</p>
<p>这是一个支持 <strong>加粗</strong>、<em>斜体</em>、<u>下划线</u>、<s>删除线</s> 和 <code>行内代码</code> 的富文本编辑器，还能插入 <a href="https://tiptap.dev">链接</a>。</p>
<h2>标题二</h2>
<blockquote>引用一段文字：好的工具应该让你专注于内容本身。</blockquote>
<p>无序列表：</p>
<ul>
  <li>拖拽、撤销、重做</li>
  <li>键盘快捷键</li>
  <li>基于 ProseMirror</li>
</ul>
<p>有序列表：</p>
<ol>
  <li>第一步</li>
  <li>第二步</li>
  <li>第三步</li>
</ol>
<pre><code class="language-js">const editor = useEditor({
  extensions: [StarterKit, Markdown],
})</code></pre>
<hr />
<p>光标放在这里，继续编辑吧 ✍️</p>
`.trim()

const content = ref(defaultContent)
const markdown = ref('')

// 客户端挂载后恢复本地保存的内容
onMounted(() => {
  content.value = localStorage.getItem(STORAGE_KEY) ?? defaultContent
})

// 内容变化时保存到本地
watch(content, (value) => {
  localStorage.setItem(STORAGE_KEY, value)
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
}

.page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid #e5e5ec;
}

.page__title {
  margin: 0;
  font-size: 17px;
}

.page__actions {
  display: flex;
  gap: 12px;
}

.page__actions button {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid #d9d9e3;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;

  &:hover {
    background: #f4f4f8;
  }
}

.page__panes {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px 20px 20px;
}

.pane {
  min-height: 0;
  background: #fff;
  border: 1px solid #d9d9e3;
  border-radius: 8px;
  overflow: hidden;
}

.pane--editor {
  display: flex;
}

/* 编辑器嵌在 pane 内，去掉自身边框避免嵌套边框 */
.pane--editor :deep(.tiptap-editor) {
  border: none;
}

.pane--markdown {
  display: flex;
  flex-direction: column;
}

.pane__section {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.pane__section + .pane__section {
  border-top: 1px solid #d9d9e3;
}

.pane__label {
  flex-shrink: 0;
  padding: 8px 16px;
  font-size: 12px;
  color: #8a8a99;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: #fafafc;
  border-bottom: 1px solid #ececf2;
}

.pane__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.md-source {
  margin: 0;
  padding: 12px 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #444;
}

.md-empty {
  margin: 0;
  padding: 12px 16px;
  color: #bbb;
  font-size: 13px;
}

/* 窄屏：上下堆叠，整页滚动 */
@media (max-width: 900px) {
  .page {
    height: auto;
    min-height: 100vh;
  }

  .page__panes {
    grid-template-columns: 1fr;
  }

  .pane--editor {
    height: 50vh;
  }

  .pane--markdown {
    height: 80vh;
  }
}
</style>
