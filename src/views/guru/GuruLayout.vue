<script setup>
import {
  LayoutDashboard,
  FileStack,
  GraduationCap,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Bell,
  Search
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const isSidebarOpen = ref(false)

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/guru' },
  { name: 'Bank Soal', icon: FileStack, path: '/guru/soal' },
  { name: 'Jadwal Ujian', icon: ClipboardList, path: '/guru/jadwal' },
  { name: 'Rekap Nilai', icon: GraduationCap, path: '/guru/nilai' }
]

const displayName = computed(() => authStore.profile?.full_name || 'Guru')
const displayEmail = computed(() => authStore.user?.email || '—')

const initials = computed(() => {
  const n = displayName.value.trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const isActive = (path) => route.path === path
</script>

<template>
  <div class="flex min-h-screen bg-zinc-50">
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-full flex-col p-4">
        <div class="mb-8 flex items-center gap-3 px-2">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm"
          >
            <GraduationCap :size="20" stroke-width="2" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-sm font-semibold tracking-tight text-zinc-900">Guru</h2>
            <p class="text-xs text-zinc-500">Panel pengajar</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
            aria-label="Tutup menu"
            @click="isSidebarOpen = false"
          >
            <X :size="20" />
          </button>
        </div>

        <nav class="flex flex-1 flex-col gap-0.5">
          <p class="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Menu</p>
          <router-link
            v-for="item in menuItems"
            :key="item.name"
            :to="item.path"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="
              isActive(item.path)
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            "
            @click="isSidebarOpen = false"
          >
            <component
              :is="item.icon"
              :size="18"
              stroke-width="2"
              class="shrink-0 text-zinc-400"
              :class="isActive(item.path) ? 'text-primary-600' : ''"
            />
            {{ item.name }}
          </router-link>
        </nav>

        <div class="mt-auto border-t border-zinc-100 pt-4">
          <div class="mb-3 flex items-center gap-3 px-2">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-semibold text-primary-700"
            >
              {{ initials }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-zinc-900">{{ displayName }}</p>
              <p class="truncate text-xs text-zinc-500">{{ displayEmail }}</p>
            </div>
          </div>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            @click="handleLogout"
          >
            <LogOut :size="18" stroke-width="2" />
            Keluar
          </button>
        </div>
      </div>
    </aside>

    <div class="flex min-h-screen flex-1 flex-col lg:min-h-0">
      <header
        class="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md sm:px-6"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 lg:hidden"
            aria-label="Buka menu"
            @click="isSidebarOpen = true"
          >
            <Menu :size="20" />
          </button>
          <div
            class="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 md:flex"
          >
            <Search :size="16" class="shrink-0 text-zinc-400" stroke-width="2" />
            <input
              type="search"
              placeholder="Cari soal atau nilai…"
              class="min-w-0 flex-1 border-0 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            class="relative rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100"
            aria-label="Notifikasi"
          >
            <Bell :size="20" stroke-width="2" />
            <span
              class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-primary-500"
            />
          </button>
          <div class="hidden h-6 w-px bg-zinc-200 sm:block" />
          <div class="hidden text-right sm:block">
            <p class="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Tahun ajaran</p>
            <p class="text-xs font-medium text-zinc-700">2025/2026 Ganjil</p>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <router-view />
      </main>
    </div>

    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-[2px] lg:hidden"
      aria-hidden="true"
      @click="isSidebarOpen = false"
    />
  </div>
</template>
