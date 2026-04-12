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
    class="pressable relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-ios-sm transition-[transform,opacity,background-color,box-shadow] duration-200 ease-ios disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
    :class="[
      variant === 'primary'
        ? 'bg-primary-600 text-white active:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
        : '',
      variant === 'secondary'
        ? 'border border-venus-200/90 bg-white text-venus-800 active:bg-venus-100/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-venus-400'
        : '',
      variant === 'danger'
        ? 'bg-red-600 text-white active:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
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
