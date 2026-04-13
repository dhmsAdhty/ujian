<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  placeholder: { type: String, default: 'Pilih...' },
  options: { type: Array, default: () => [] },
  error: String,
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const mounted = ref(true) // track lifecycle to disable Teleport before unmount
const triggerRef = ref(null)
const dropdownStyle = ref({})

const selectedLabel = computed(() => {
  if (props.modelValue === '' || props.modelValue == null) return null
  const found = props.options.find(
    (o) => String(typeof o === 'object' ? o.value : o) === String(props.modelValue),
  )
  return found ? (typeof found === 'object' ? found.label : found) : null
})

const select = (opt) => {
  emit('update:modelValue', typeof opt === 'object' ? opt.value : opt)
  open.value = false
}

const openDropdown = async () => {
  if (props.disabled) return
  open.value = !open.value
  if (!open.value) return

  await nextTick()
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return

  const spaceBelow = window.innerHeight - rect.bottom
  const dropUp = spaceBelow < 200 && rect.top > 200

  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: 9999,
    ...(dropUp
      ? { bottom: `${window.innerHeight - rect.top + 4}px` }
      : { top: `${rect.bottom + 4}px` }),
  }
}

const handleOutside = (e) => {
  if (!triggerRef.value?.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', handleOutside))

onBeforeUnmount(() => {
  // Close dropdown BEFORE component is destroyed to prevent Teleport orphan crash
  open.value = false
  mounted.value = false
  document.removeEventListener('mousedown', handleOutside)
})
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      class="mb-1.5 ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400"
    >
      {{ label }}
    </label>

    <!-- Trigger button -->
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-2 rounded-xl border bg-venus-50 px-3.5 py-2.5 text-sm font-medium outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-ios disabled:cursor-not-allowed disabled:opacity-50"
      :class="[
        open
          ? 'border-primary-300 bg-white ring-2 ring-primary-500/20'
          : error
            ? 'border-red-300'
            : 'border-venus-100',
        selectedLabel ? 'text-venus-900' : 'text-venus-400',
      ]"
      @click="openDropdown"
    >
      <span class="truncate">{{ selectedLabel ?? placeholder }}</span>
      <svg
        class="h-4 w-4 shrink-0 text-venus-400 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- Teleport disabled before unmount to prevent orphan crash -->
    <Teleport v-if="mounted" to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1 scale-[0.98]"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 translate-y-1 scale-[0.98]"
      >
        <div
          v-if="open"
          :style="dropdownStyle"
          class="overflow-hidden rounded-xl border border-venus-100 bg-white shadow-venus"
        >
          <button
            v-if="placeholder"
            type="button"
            class="flex w-full items-center px-3.5 py-2.5 text-sm text-venus-400 transition-colors hover:bg-venus-50"
            @mousedown.prevent="emit('update:modelValue', ''); open = false"
          >
            {{ placeholder }}
          </button>
          <div v-if="placeholder" class="mx-3 border-t border-venus-50" />

          <button
            v-for="opt in options"
            :key="typeof opt === 'object' ? opt.value : opt"
            type="button"
            class="flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-medium transition-colors"
            :class="
              String(typeof opt === 'object' ? opt.value : opt) === String(modelValue)
                ? 'bg-primary-50 text-primary-700'
                : 'text-venus-700 hover:bg-venus-50'
            "
            @mousedown.prevent="select(opt)"
          >
            <span>{{ typeof opt === 'object' ? opt.label : opt }}</span>
            <svg
              v-if="String(typeof opt === 'object' ? opt.value : opt) === String(modelValue)"
              class="h-4 w-4 text-primary-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>

    <p v-if="error" class="ml-0.5 mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
