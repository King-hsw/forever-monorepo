/// <reference lib="webworker" />
// 自定义 Service Worker（injectManifest 模式）：在保留 PWA 预缓存能力的同时，
// 处理 Web Push 的接收与点击。generateSW 生成的 SW 无法注入这些监听。
declare let self: ServiceWorkerGlobalScope

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// 预缓存构建产物（清单由 vite-plugin-pwa 注入 self.__WB_MANIFEST）
precacheAndRoute(self.__WB_MANIFEST)

// 页面导航 NetworkFirst（原 generateSW workbox.runtimeCaching 的等价实现）
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && url.origin === self.location.origin,
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 })],
  }),
)

/* ---------- Web Push ---------- */

interface PushPayload {
  title?: string
  body?: string
  url?: string
}

self.addEventListener('push', (event) => {
  if (!event.data)
    return
  let payload: PushPayload = {}
  try {
    payload = event.data.json() as PushPayload
  }
  catch {
    payload = { body: event.data.text() }
  }
  event.waitUntil((async () => {
    // 送达回执：SW 收到 push 即上报自身 endpoint，供服务端记录最近送达时间、确认端到端链路
    const sub = await self.registration.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/v1/push/delivered', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {})
    }
    await self.registration.showNotification(payload.title ?? '补陋阁', {
      body: payload.body ?? '你有新消息',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'forever-push',
      data: { url: payload.url ?? '/' },
    })
  })())
})

// 点击通知：已有本站窗口则聚焦并跳转，否则新开
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of list) {
      if ('navigate' in client && 'focus' in client) {
        client.navigate(url)
        return client.focus()
      }
    }
    return self.clients.openWindow(url)
  })())
})

// autoUpdate 语义：新 SW 立即接管
self.skipWaiting()
clientsClaim()
