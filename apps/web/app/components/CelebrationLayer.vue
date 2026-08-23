<template>
  <div class="celebration" aria-hidden="true">
    <span
      v-for="(p, i) in pieces"
      :key="i"
      class="celebration__piece"
      :style="p"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 周年庆背景层：固定定位的彩纸纷飞。
 * - 彩纸位置/尺寸/时长由确定性伪随机生成（SSR 与水合一致）
 * - 三种形状：矩形 / 圆点 / 三角；五色暖调轮换
 * - 极低透明度，只做氛围不打扰阅读
 * - prefers-reduced-motion 下动画被全局禁用，彩纸停在透明态不可见
 */
const COLORS = ['#ee8a3c', '#f2c14e', '#93b884', '#cd6f52', '#b98a5e']

/** 可复现的伪随机数（避免 Math.random 导致 SSR/客户端不一致） */
function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const pieces = (() => {
  const rng = makeRng(20260214)
  return Array.from({ length: 18 }, (_, i) => {
    const size = 6 + rng() * 8
    const dur = 11 + rng() * 12
    const shape = i % 3
    const style: Record<string, string> = {
      left: `${(rng() * 96 + 2).toFixed(1)}%`,
      width: `${shape === 1 ? size : size * 0.72}px`,
      height: `${size}px`,
      '--drift': `${((rng() * 2 - 1) * 120).toFixed(0)}px`,
      '--rot': `${Math.round(rng() * 2 > 1 ? 360 + rng() * 360 : -(360 + rng() * 360))}deg`,
      '--o': `${(0.16 + rng() * 0.14).toFixed(2)}`,
      animationDuration: `${dur.toFixed(1)}s`,
      animationDelay: `${(-rng() * dur).toFixed(1)}s`,
    }
    if (shape === 0)
      style.background = COLORS[i % COLORS.length]
    else if (shape === 1)
      style.background = COLORS[(i + 2) % COLORS.length]
    else
      style.background = COLORS[(i + 4) % COLORS.length]
    return style
  })
})()
</script>

<style scoped>
/* 固定铺满视口，z-index:-1：垫在所有内容之下、页面底色之上 */
.celebration {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.celebration__piece {
  position: absolute;
  top: 0;
  border-radius: 2px;
  opacity: 0;
  animation-name: celebration-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}

/* 圆点与三角两种异形 */
.celebration__piece:nth-child(3n + 2) {
  border-radius: 50%;
}

.celebration__piece:nth-child(3n) {
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  border-radius: 0;
}

@keyframes celebration-fall {
  0% {
    transform: translate3d(0, -8vh, 0) rotate(0deg);
    opacity: 0;
  }
  8% {
    opacity: var(--o, 0.2);
  }
  90% {
    opacity: var(--o, 0.2);
  }
  100% {
    transform: translate3d(var(--drift, 40px), 108vh, 0) rotate(var(--rot, 360deg));
    opacity: 0;
  }
}
</style>
