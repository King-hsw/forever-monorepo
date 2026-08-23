<template>
  <div ref="el" class="tag-sphere" aria-label="标签环绕云">
    <NuxtLink
      v-for="(tag, i) in tags"
      :key="tag.id"
      to="/posts"
      class="tag-sphere__item"
      :style="initialStyle(i)"
    >{{ tag.name }}<sup>{{ tag.count }}</sup></NuxtLink>
  </div>
</template>

<script setup lang="ts">
/**
 * 3D 标签环绕云：标签按斐波那契数列均匀分布在球面上，
 * rAF 驱动绕 Y 轴旋转 + 固定倾角，按深度投影缩放/调整透明度。
 * 悬停时转速放缓并跟随指针倾斜；尊重 prefers-reduced-motion；
 * 滚出视口或页面隐藏时自动暂停，节省性能。
 */
interface SphereTag {
  id: number | string
  name: string
  count: number
  size?: number
}

const props = defineProps<{ tags: SphereTag[] }>()

/** 球体半径（px）：容器为正方形，半径留出标签自身尺寸的余量 */
const RADIUS = 105
/** 基础角速度（rad/s） */
const BASE_SPEED = 0.35
/** 固定倾角（rad），让球面带一点俯视的立体感 */
const BASE_TILT = 0.42

const el = ref<HTMLElement | null>(null)

/** 斐波那契球面均匀布点（确定性，SSR 安全） */
const basePoints = computed(() => {
  const n = props.tags.length
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: n }, (_, i) => {
    if (n === 1)
      return { x: 0, y: 0, z: 1 }
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenAngle * i
    return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r }
  })
})

/** SSR 与首帧的静态位置（无旋转，仅固定倾角），避免水合闪跳 */
function initialStyle(i: number) {
  const p = basePoints.value[i]
  if (!p)
    return {}
  const cosT = Math.cos(BASE_TILT)
  const sinT = Math.sin(BASE_TILT)
  const y = p.y * cosT - p.z * sinT
  return {
    transform: `translate(-50%, -50%) translate3d(${(p.x * RADIUS).toFixed(1)}px, ${(y * RADIUS).toFixed(1)}px, 0)`,
    fontSize: `${props.tags[i]?.size ?? 14}px`,
  }
}

let rafId = 0
let running = false
let angle = 0
let tilt = BASE_TILT
let targetTilt = BASE_TILT
let speedFactor = 1
let targetSpeedFactor = 1
let lastTs = 0
let items: HTMLElement[] = []
let io: IntersectionObserver | null = null

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function frame(ts: number) {
  if (!running)
    return

  const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016
  lastTs = ts

  // 惯性逼近目标转速与倾角
  speedFactor += (targetSpeedFactor - speedFactor) * 0.06
  tilt += (targetTilt - tilt) * 0.08
  angle += BASE_SPEED * speedFactor * dt

  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const cosT = Math.cos(tilt)
  const sinT = Math.sin(tilt)

  for (let i = 0; i < items.length; i++) {
    const p = basePoints.value[i]
    const node = items[i]
    if (!p || !node)
      continue

    // 绕 Y 轴旋转
    const x1 = p.x * cosA + p.z * sinA
    const z1 = -p.x * sinA + p.z * cosA
    // 绕 X 轴倾斜
    const y2 = p.y * cosT - z1 * sinT
    const z2 = p.y * sinT + z1 * cosT

    // 深度投影：z ∈ [-1, 1] → 缩放 0.4~1，透明度 0.35~1
    const scale = 0.4 + 0.6 * ((z2 + 1) / 2)
    const opacity = 0.35 + 0.65 * ((z2 + 1) / 2)

    node.style.transform
      = `translate(-50%, -50%) translate3d(${(x1 * RADIUS).toFixed(1)}px, ${(y2 * RADIUS).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`
    node.style.opacity = opacity.toFixed(3)
    node.style.zIndex = String(Math.round((z2 + 1) * 50))
  }

  rafId = requestAnimationFrame(frame)
}

function start() {
  if (running || prefersReducedMotion() || !items.length)
    return
  running = true
  lastTs = 0
  rafId = requestAnimationFrame(frame)
}

function stop() {
  running = false
  cancelAnimationFrame(rafId)
}

function onPointerMove(e: PointerEvent) {
  if (!el.value)
    return
  const rect = el.value.getBoundingClientRect()
  // 归一化到 -1 ~ 1：水平位置调节转速，竖直位置调节倾角
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
  targetSpeedFactor = 0.25
  targetTilt = BASE_TILT + ny * 0.45
  angle += nx * 0.002 // 轻微跟随指针方向
}

function onPointerLeave() {
  targetSpeedFactor = 1
  targetTilt = BASE_TILT
}

onMounted(() => {
  if (!el.value)
    return
  items = Array.from(el.value.querySelectorAll<HTMLElement>('.tag-sphere__item'))

  if (prefersReducedMotion())
    return

  el.value.addEventListener('pointermove', onPointerMove, { passive: true })
  el.value.addEventListener('pointerleave', onPointerLeave, { passive: true })

  // 滚出视口暂停，滚回来恢复
  io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting)
      start()
    else
      stop()
  }, { rootMargin: '60px' })
  io.observe(el.value)

  if (document.hidden) {
    document.addEventListener('visibilitychange', start, { once: true })
  }
  else {
    start()
  }
})

onBeforeUnmount(() => {
  stop()
  io?.disconnect()
  el.value?.removeEventListener('pointermove', onPointerMove)
  el.value?.removeEventListener('pointerleave', onPointerLeave)
})
</script>

<style scoped>
.tag-sphere {
  position: relative;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
  margin: 0 auto;
  touch-action: pan-y;
}

/* 标签：绝对定位在球心，位置完全由 transform 驱动 */
.tag-sphere__item {
  position: absolute;
  left: 50%;
  top: 50%;
  padding: 5px 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  border-radius: 999px;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

/* 糖果色轮换：粉 / 紫 / 薄荷 / 柠檬 / 天空蓝 */
.tag-sphere__item:nth-child(5n + 1) {
  color: color-mix(in srgb, #e56f43 75%, var(--c-text));
  background: color-mix(in srgb, #e56f43 13%, var(--c-bg-card));
  border: 1.5px solid color-mix(in srgb, #e56f43 30%, transparent);
}

.tag-sphere__item:nth-child(5n + 2) {
  color: color-mix(in srgb, #c05868 80%, var(--c-text));
  background: color-mix(in srgb, #c05868 15%, var(--c-bg-card));
  border: 1.5px solid color-mix(in srgb, #c05868 32%, transparent);
}

.tag-sphere__item:nth-child(5n + 3) {
  color: color-mix(in srgb, #93b884 75%, var(--c-text));
  background: color-mix(in srgb, #93b884 13%, var(--c-bg-card));
  border: 1.5px solid color-mix(in srgb, #93b884 30%, transparent);
}

.tag-sphere__item:nth-child(5n + 4) {
  color: color-mix(in srgb, #8ba692 75%, var(--c-text));
  background: color-mix(in srgb, #8ba692 13%, var(--c-bg-card));
  border: 1.5px solid color-mix(in srgb, #8ba692 30%, transparent);
}

.tag-sphere__item:nth-child(5n + 5) {
  color: color-mix(in srgb, #b98a5e 75%, var(--c-text));
  background: color-mix(in srgb, #b98a5e 13%, var(--c-bg-card));
  border: 1.5px solid color-mix(in srgb, #b98a5e 30%, transparent);
}

.tag-sphere__item:hover {
  border-color: currentcolor;
  box-shadow: 0 4px 12px rgb(229 111 67 / 20%);
}

.tag-sphere__item sup {
  margin-left: 3px;
  font-size: 0.6em;
  opacity: 0.6;
}
</style>
