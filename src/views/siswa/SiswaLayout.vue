<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BookOpen } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()
const isExamActive = computed(() => route.name === 'siswa-aktif')

const menuItems = [
  { name: 'Ujian Saya', icon: BookOpen, path: '/siswa' }
]
</script>

<template>
  <AppLayout
    :menu-items="menuItems"
    brand-title="CBT ATS"
    brand-subtitle="Portal Siswa"
    :brand-icon="BookOpen"
    :hide-sidebar="isExamActive"
  />
</template>
