<template>
  <!-- 布尔型配置开关：settings / setup 共用 -->
  <span class="setting-switch">
    <button
      type="button"
      class="switch"
      :class="{ 'is-on': on }"
      role="switch"
      :aria-checked="on"
      :aria-label="label"
      @click="emit('toggle')"
    >
      <span class="switch__knob" />
    </button>
    <span class="switch__text">{{ on ? '开启' : '关闭' }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  /** 当前是否开启 */
  on: boolean
  /** 无障碍标签（配置项名称） */
  label: string
}>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<style scoped>
.switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
  padding: 0;
  background: var(--c-border);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &.is-on {
    background: var(--c-primary);
  }
}

.switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.switch.is-on .switch__knob {
  transform: translateX(18px);
}

.switch__text {
  width: 30px;
  margin-left: 10px;
  font-size: 13px;
  color: var(--c-text-secondary);
}
</style>
