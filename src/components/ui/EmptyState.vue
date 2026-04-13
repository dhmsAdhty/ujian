<script setup>
import { AlertCircle } from 'lucide-vue-next'

defineProps({
  title: {
    type: String,
    default: 'Data Belum Ditemukan'
  },
  description: {
    type: String,
    default: 'Belum ada informasi yang tersedia untuk ditampilkan saat ini.'
  },
  icon: {
    type: [Object, Function],
    default: () => AlertCircle
  }
})
</script>

<template>
  <div class="flex animate-fade-in flex-col items-center justify-center space-y-4 p-10 text-center">
    <div
      class="flex h-20 w-20 items-center justify-center rounded-2xl border border-venus-100 bg-venus-50 text-venus-300"
    >
      <component :is="icon" :size="40" stroke-width="1.5" />
    </div>
    <div class="space-y-1.5">
      <h3 class="text-lg font-semibold tracking-tight text-venus-800">{{ title }}</h3>
      <p class="mx-auto max-w-sm text-sm leading-relaxed text-venus-500">{{ description }}</p>
    </div>
    <slot name="action" />
  </div>
</template>
