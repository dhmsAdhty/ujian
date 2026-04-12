<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { BookOpen, LogOut } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const displayName = computed(() => authStore.profile?.full_name || 'Siswa')
const isUjianListActive = computed(() => route.name === 'siswa-examine')

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-zinc-50">
    <aside
      class="z-20 hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex"
    >
      <div class="flex h-full flex-col p-4">
        <div class="mb-8 flex items-center gap-3 px-1">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm"
          >
            <BookOpen :size="18" stroke-width="2" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-900">Siswa</h2>
            <p class="text-xs text-zinc-500">CBT ATS</p>
          </div>
        </div>
        <nav class="flex-1">
          <router-link
            to="/siswa"
            class="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="
              isUjianListActive
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            "
          >
            Ujian saya
          </router-link>
        </nav>
        <div class="border-t border-zinc-100 pt-4">
          <p class="mb-3 truncate px-3 text-xs text-zinc-500">{{ displayName }}</p>
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

    <main class="min-h-screen flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div class="mb-6 flex items-center justify-between lg:hidden">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <BookOpen :size="18" stroke-width="2" />
          </div>
          <span class="text-sm font-semibold text-zinc-900">CBT ATS</span>
        </div>
        <button
          type="button"
          class="text-sm font-medium text-red-600"
          @click="handleLogout"
        >
          Keluar
        </button>
      </div>
      <router-view />
    </main>
  </div>
</template>
