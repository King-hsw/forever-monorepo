import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 应用启动:静默续期(bootstrap)
const auth = useAuthStore()
auth.bootstrap()

app.mount('#app')
