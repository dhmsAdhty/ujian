<script setup>
import { BookOpen } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'

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
  />
</template>
