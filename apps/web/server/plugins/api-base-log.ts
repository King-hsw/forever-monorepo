/**
 * 启动时打印 SSR 实际使用的后端地址。
 *
 * 云上部署时 NUXT_API_BASE 由容器环境变量注入，配错（比如沿用 Dockerfile 默认的
 * http://localhost:8080，或指到了公网域名被网关拦截）在页面上看不出任何区别——
 * SSR 渲染出来就是空数据。开机打一行，登录到机器上就能立刻确认，不用等请求。
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const base = config.apiBase as string
  const fromEnv = process.env.NUXT_API_BASE
  console.log(
    `[api] SSR 后端地址 = ${base}（来源：${fromEnv ? '环境变量 NUXT_API_BASE' : 'nuxt.config 默认值'}）`
    + `${fromEnv && fromEnv !== base ? ` ⚠️ 环境变量为 ${fromEnv}，与生效值不一致` : ''}`,
  )
})
