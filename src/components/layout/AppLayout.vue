<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { LogOut, Menu, X, Bell } from 'lucide-vue-next'

const props = defineProps({
  menuItems: {
    type: Array,
    required: true
    // [{ name, icon (component), path }]
  },
  brandTitle: {
    type: String,
    default: 'CBT ATS'
  },
  brandSubtitle: {
    type: String,
    default: ''
  },
  brandIcon: {
    type: [Object, Function],
    default: null
  },
  topbarRight: {
    type: String,
    default: ''
  }
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const isSidebarOpen = ref(false)

const displayName = computed(() => authStore.profile?.full_name || props.brandTitle)
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
  <div class="flex h-screen overflow-hidden bg-venus-50">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-venus-100 bg-white shadow-venus transition-transform duration-300 ease-ios lg:static lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-full flex-col">
        <!-- Brand Header — mirrors Venus DrawerItems header -->
        <div class="sticky top-0 z-10 flex items-center gap-3 border-b border-venus-100 bg-white px-6 py-5">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-ios-sm"
          >
            <component v-if="brandIcon" :is="brandIcon" :size="20" stroke-width="2" />
            <span v-else class="text-sm font-black">{{ brandTitle.charAt(0) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-sm font-black uppercase tracking-widest text-primary-600">
              {{ brandTitle }}
            </h2>
            <p v-if="brandSubtitle" class="text-[10px] font-semibold uppercase tracking-widest text-venus-400">
              {{ brandSubtitle }}
            </p>
          </div>
          <button
            type="button"
            class="pressable-soft rounded-xl p-2 text-venus-400 active:bg-venus-100 lg:hidden"
            aria-label="Tutup menu"
            @click="isSidebarOpen = false"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- Nav Items -->
        <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-4 py-5">
          <p class="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-venus-400">Menu</p>
          <router-link
            v-for="item in menuItems"
            :key="item.name"
            :to="item.path"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color] duration-200 ease-ios focus-visible:outline-none"
            :class="
              isActive(item.path)
                ? 'bg-primary-50 text-primary-700 font-semibold'
                : 'text-venus-600 hover:bg-venus-50 active:bg-venus-100'
            "
            @click="isSidebarOpen = false"
          >
            <component
              :is="item.icon"
              :size="18"
              stroke-width="2"
              class="shrink-0 transition-colors"
              :class="isActive(item.path) ? 'text-primary-600' : 'text-venus-400'"
            />
            {{ item.name }}
          </router-link>
        </nav>

        <!-- User Footer -->
        <div class="border-t border-venus-100 px-4 py-4">
          <div class="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-black text-primary-700"
            >
              {{ initials }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-venus-900">{{ displayName }}</p>
              <p class="truncate text-xs text-venus-400">{{ displayEmail }}</p>
            </div>
          </div>
          <button
            type="button"
            class="pressable-soft flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50/80 active:bg-red-50/80 focus-visible:outline-none"
            @click="handleLogout"
          >
            <LogOut :size="18" stroke-width="2" />
            Keluar
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Topbar -->
      <header
        class="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-venus-100 bg-white/90 px-4 backdrop-blur-xl sm:px-6"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="pressable-soft rounded-xl border border-venus-100 p-2 text-venus-500 active:bg-venus-100 lg:hidden"
            aria-label="Buka menu"
            @click="isSidebarOpen = true"
          >
            <Menu :size="20" />
          </button>
          <!-- Search slot or default -->
          <slot name="topbar-left">
            <div
              class="hidden max-w-xs flex-1 items-center gap-2 rounded-xl border border-venus-100 bg-venus-50/80 px-3 py-2 md:flex"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-venus-400">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="search"
                placeholder="Cari…"
                class="min-w-0 flex-1 border-0 bg-transparent text-sm text-venus-800 outline-none placeholder:text-venus-400"
              />
            </div>
          </slot>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <slot name="topbar-right">
            <button
              type="button"
              class="pressable-soft relative rounded-xl p-2 text-venus-400 transition-colors active:bg-venus-100"
              aria-label="Notifikasi"
            >
              <Bell :size="20" stroke-width="2" />
              <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-primary-500" />
            </button>
            <div class="hidden h-5 w-px bg-venus-100 sm:block" />
            <div v-if="topbarRight" class="hidden text-right sm:block">
              <p class="text-[10px] font-black uppercase tracking-widest text-venus-400">Info</p>
              <p class="text-xs font-semibold text-venus-700">{{ topbarRight }}</p>
            </div>
          </slot>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <router-view />
      </main>
    </div>

    <!-- Mobile overlay -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-40 bg-venus-900/20 backdrop-blur-[2px] lg:hidden"
      aria-hidden="true"
      @click="isSidebarOpen = false"
    />
  </div>
</template>
