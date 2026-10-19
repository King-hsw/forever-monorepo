import { createApp, type Component } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import Icon from './components/Icon.vue'
import './assets/css/main.css'
import './assets/css/prose.css'
import './assets/css/hljs-dark.css'

const app = createApp(App)

// 全局图标组件:页面里直接写 <Icon name="lucide:图标名" />
app.component('Icon', Icon)

/**
 * 组件全局注册。
 * 这批页面从 Nuxt 迁来，模板里按文件名直接写 <AdminPostForm />、<SafeImage />，
 * 靠的是 Nuxt 的组件自动导入；纯 Vue 下没有这层，必须自己注册，
 * 否则组件解析失败 → 页面静默渲染成空白（控制台只有 Failed to resolve component）。
 * 约定：文件名（不含 .vue）= 组件名，与迁移前保持一致。
 */
const componentModules = import.meta.glob<{ default: Component }>('./components/**/*.vue', { eager: true })
for (const [path, mod] of Object.entries(componentModules)) {
  const name = path.split('/').pop()!.replace(/\.vue$/, '')
  if (name !== 'Icon')
    app.component(name, mod.default)
}

app.use(createPinia())
app.use(router)

// 应用启动:静默续期(bootstrap)
const auth = useAuthStore()
auth.bootstrap()

app.mount('#app')
