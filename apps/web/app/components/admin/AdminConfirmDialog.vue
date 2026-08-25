<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        class="confirm-dialog__overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @click.self="emit('cancel')"
      >
        <div class="confirm-dialog card">
          <h3 class="confirm-dialog__title">{{ title }}</h3>
          <p class="confirm-dialog__message">{{ message }}</p>
          <input
            v-if="showInput"
            ref="inputEl"
            v-model="inputValue"
            class="field-input confirm-dialog__input"
            :type="inputType"
            :placeholder="inputPlaceholder"
            @keydown.enter="emit('confirm', inputValue)"
          >
          <footer class="confirm-dialog__actions">
            <button ref="cancelBtn" type="button" class="btn" @click="emit('cancel')">
              取消
            </button>
            <button
              type="button"
              class="btn confirm-dialog__confirm"
              @click="emit('confirm', inputValue)"
            >
              {{ confirmText }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmText?: string
    /** 显示一个输入框（如重置密码），确认时把输入值作为 confirm 事件参数传出 */
    showInput?: boolean
    inputType?: string
    inputPlaceholder?: string
  }>(),
  {
    confirmText: '删除',
    inputType: 'text',
    inputPlaceholder: '',
  },
)

const emit = defineEmits<{ confirm: [value?: string], cancel: [] }>()

const cancelBtn = ref<HTMLButtonElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const inputValue = ref('')

watch(
  () => props.open,
  (open) => {
    if (open && import.meta.client) {
      inputValue.value = ''
      nextTick(() => (props.showInput ? inputEl.value?.focus() : cancelBtn.value?.focus()))
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    emit('cancel')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.confirm-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(28 25 23 / 40%);
}

.confirm-dialog {
  width: min(380px, 100%);
  padding: 22px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card-hover);
}

.confirm-dialog__input {
  margin-top: 12px;
}

.confirm-dialog__title {
  margin: 0 0 8px;
  font-size: 16px;
}

.confirm-dialog__message {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--c-text-secondary);
  overflow-wrap: anywhere;
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;

  .btn {
    min-width: 76px;
    padding-block: 7px;
  }
}

.confirm-dialog__confirm {
  background: var(--c-danger);
  border-color: var(--c-danger);
  color: #fff;

  &:hover:not(:disabled) {
    background: #dc2626;
    border-color: #dc2626;
  }
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.22s ease;

  .confirm-dialog {
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;

  .confirm-dialog {
    transform: translateY(12px) scale(0.96);
  }
}
</style>
