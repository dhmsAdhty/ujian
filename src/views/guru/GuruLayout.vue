<script setup>
import { LayoutDashboard, FileStack, GraduationCap, ClipboardList } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/guru' },
  { name: 'Bank Soal', icon: FileStack, path: '/guru/soal' },
  { name: 'Jadwal Ujian', icon: ClipboardList, path: '/guru/jadwal' },
  { name: 'Rekap Nilai', icon: GraduationCap, path: '/guru/nilai' }
]
</script>

<template>
  <AppLayout
    :menu-items="menuItems"
    brand-title="CBT ATS"
    brand-subtitle="Panel Pengajar"
    :brand-icon="GraduationCap"
    topbar-right="2025/2026 Ganjil"
  />
</template>
