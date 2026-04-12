<script setup>
import { BarChart3, Users, BookOpen, FileStack, Settings, LayoutDashboard } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { name: 'Manajemen User', icon: Users, path: '/admin/users' },
  { name: 'Mata Pelajaran', icon: BookOpen, path: '/admin/mapel' },
  { name: 'Bank Soal', icon: FileStack, path: '/admin/soal' },
  { name: 'Laporan Nilai', icon: BarChart3, path: '/admin/laporan' },
  { name: 'Pengaturan', icon: Settings, path: '/admin/settings' }
]
</script>

<template>
  <AppLayout
    :menu-items="menuItems"
    brand-title="CBT ATS"
    brand-subtitle="Panel Admin"
    :brand-icon="LayoutDashboard"
    topbar-right="Operasional"
  />
</template>
