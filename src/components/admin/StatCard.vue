<script setup>
import { GlassCard } from '@/components/ui'

defineProps({
  title: String,
  value: [String, Number],
  icon: [Object, Function],
  trend: String,
  color: {
    type: String,
    default: 'primary'
  }
})
</script>

<template>
  <GlassCard padding="p-5" class="relative overflow-hidden">
    <div class="absolute -right-6 -bottom-6 text-venus-100 opacity-90">
      <component :is="icon" :size="88" stroke-width="1.25" />
    </div>

    <div class="relative flex items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <p class="text-xs font-medium text-venus-500">{{ title }}</p>
        <p class="text-2xl font-semibold tracking-tight text-venus-900">{{ value }}</p>
        <p v-if="trend" class="flex items-center gap-1 text-xs font-medium text-emerald-600">
          <span aria-hidden="true">↑</span>
          {{ trend }} vs bulan lalu
        </p>
      </div>

      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        :class="[
          color === 'primary' ? 'bg-primary-100 text-primary-700' : '',
          color === 'orange' ? 'bg-orange-100 text-orange-700' : '',
          color === 'blue' ? 'bg-sky-100 text-sky-700' : '',
          color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : ''
        ]"
      >
        <component :is="icon" :size="22" stroke-width="2" />
      </div>
    </div>
  </GlassCard>
</template>
