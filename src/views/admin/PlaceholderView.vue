<script setup>
import { useRoute } from 'vue-router'
import { Construction } from 'lucide-vue-next'

const route = useRoute()
const pageName = route.path.split('/').pop()
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-venus-100 bg-venus-50 text-venus-300">
      <Construction :size="32" stroke-width="1.5" />
    </div>
    <h2 class="text-lg font-semibold text-venus-800 capitalize">{{ pageName }}</h2>
    <p class="mt-1 text-sm text-venus-400">Halaman ini sedang dalam pengembangan.</p>
  </div>
</template>
