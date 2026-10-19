<template>
  <span
    ref="root"
    class="tooltip"
    :data-placement="activePlacement"
    :data-open="open ? 'true' : 'false'"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <!-- 文案与触发元素的 aria-label 重复，仅作视觉提示，对读屏器隐藏 -->
    <span class="tooltip__bubble" role="tooltip" aria-hidden="true">
      <slot name="content">{{ label }}</slot>
    </span>
  </span>
</template>

<script setup lang="ts">
type Placement = 'top' | 'right' | 'bottom' | 'left'

const props = withDefaults(defineProps<{
  /** 气泡文案，也可用 #content 插槽自定义 */
  label?: string
  /** auto：展开时取触发元素视口中空间最大的一侧；也可手动指定 */
  placement?: 'auto' | Placement
}>(), { label: '', placement: 'auto' })

const root = ref<HTMLElement>()
const open = ref(false)
// auto 方位实测前先用 right 占位（仅客户端 hover 时才可见）
const autoPlacement = ref<Placement>('right')

const activePlacement = computed(
  () => props.placement === 'auto' ? autoPlacement.value : props.placement,
)

function show() {
  if (props.placement === 'auto' && root.value) {
    const r = root.value.getBoundingClientRect()
    // ponytail: 只在展开时测一次，打开期间滚动/拖窗口不跟随，真需要再监听 scroll
    const space: Record<Placement, number> = {
      top: r.top,
      right: window.innerWidth - r.right,
      bottom: window.innerHeight - r.bottom,
      left: r.left,
    }
    autoPlacement.value = (Object.keys(space) as Placement[]).reduce(
      (best, side) => (space[side] > space[best] ? side : best),
      'right' as Placement,
    )
  }
  open.value = true
}

function hide() {
  open.value = false
}
</script>

<style scoped>
.tooltip {
  position: relative;
  display: inline-flex;
}

.tooltip__bubble {
  position: absolute;
  z-index: 70;
  padding: 5px 10px;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  color: var(--c-bg-card);
  background: var(--c-text);
  border-radius: 8px;
  box-shadow: var(--shadow-card-hover);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.tooltip[data-open='true'] .tooltip__bubble {
  opacity: 1;
}

/* 箭头：与气泡同色的 45° 小方块 */
.tooltip__bubble::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--c-text);
}

/* right：图标右侧弹出 */
.tooltip[data-placement='right'] .tooltip__bubble {
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
}

.tooltip[data-placement='right'] .tooltip__bubble::before {
  left: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.tooltip[data-placement='right'][data-open='true'] .tooltip__bubble {
  transform: translateY(-50%);
}

/* left */
.tooltip[data-placement='left'] .tooltip__bubble {
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(4px);
}

.tooltip[data-placement='left'] .tooltip__bubble::before {
  right: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.tooltip[data-placement='left'][data-open='true'] .tooltip__bubble {
  transform: translateY(-50%);
}

/* top */
.tooltip[data-placement='top'] .tooltip__bubble {
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
}

.tooltip[data-placement='top'] .tooltip__bubble::before {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.tooltip[data-placement='top'][data-open='true'] .tooltip__bubble {
  transform: translateX(-50%);
}

/* bottom */
.tooltip[data-placement='bottom'] .tooltip__bubble {
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
}

.tooltip[data-placement='bottom'] .tooltip__bubble::before {
  top: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.tooltip[data-placement='bottom'][data-open='true'] .tooltip__bubble {
  transform: translateX(-50%);
}
</style>
