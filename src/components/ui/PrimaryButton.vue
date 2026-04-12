<script setup>
defineProps({
  loading: Boolean,
  disabled: Boolean,
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary'
  }
})
</script>

<template>
  <button
    :type="type"
    :disabled="loading || disabled"
    class="relative inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    :class="[
      variant === 'primary'
        ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
        : '',
      variant === 'secondary'
        ? 'border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400'
        : '',
      variant === 'danger'
        ? 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
        : ''
    ]"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
    <slot v-else />
  </button>
</template>
