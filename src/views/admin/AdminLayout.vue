<script setup>
import { BarChart3, Users, BookOpen, FileStack, Settings, LayoutDashboard, UserCheck, School, Activity, Trash2 } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { name: 'Manajemen User', icon: Users, path: '/admin/users' },
  { name: 'Mata Pelajaran', icon: BookOpen, path: '/admin/mapel' },
  { name: 'Kelola Kelas', icon: School, path: '/admin/kelas' },
  { name: 'Penugasan Guru', icon: UserCheck, path: '/admin/penugasan' },
  { name: 'Statistik Soal', icon: FileStack, path: '/admin/soal' },
  { name: 'Laporan Nilai', icon: BarChart3, path: '/admin/laporan' },
  { name: 'Aktivitas Pengguna', icon: Activity, path: '/admin/aktivitas' },
  { name: 'Sampah Soal', icon: Trash2, path: '/admin/trash' },
  { name: 'Pengaturan', icon: Settings, path: '/admin/settings' },
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
