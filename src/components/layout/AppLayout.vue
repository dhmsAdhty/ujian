<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { LogOut, Menu, X, Bell } from 'lucide-vue-next'
import Swal from 'sweetalert2'
import WhatsNewModal from '@/components/layout/WhatsNewModal.vue'
import { AppTour } from '@/components/ui'

const props = defineProps({
  menuItems: {
    type: Array,
    required: true
  },
  brandTitle: { type: String, default: 'CBT ATS' },
  brandSubtitle: { type: String, default: '' },
  brandIcon: { type: [Object, Function], default: null },
  topbarRight: { type: String, default: '' },
  hideSidebar: { type: Boolean, default: false }
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const isSidebarOpen = ref(false)
const isTourActive = ref(false)

const tourSteps = computed(() => {
  if (authStore.role === 'guru') {
    return [
      // — Langkah 1: Perkenalkan menu Monitoring di sidebar —
      {
        target: '#sidebar-menu-monitoring',
        title: '1. Menu Monitoring Siswa',
        content: 'Menu baru! Pantau pelanggaran (keluar tab) dan progres pengerjaan soal siswa secara real-time langsung dari sini.'
      },
      // — Langkah 2: Perkenalkan menu Jadwal Ujian —
      {
        target: '#sidebar-menu-jadwal-ujian',
        title: '2. Jadwal Ujian',
        content: 'Buka halaman Jadwal Ujian. Di sini Anda bisa melihat semua ujian yang telah dibuat, lengkap dengan tombol pratinjau POV siswa.'
      },
      // — Langkah 3: Sorot tombol mata Preview POV di baris pertama tabel —
      {
        route: '/guru/jadwal',
        target: '#tour-btn-preview-jadwal',
        title: '3. Tombol Pratinjau POV Siswa',
        content: 'Ini dia! Klik tombol mata 👁 pada baris ujian mana pun untuk membuka simulator interaktif persis seperti yang dilihat siswa saat mengerjakan ujian.'
      },
      // — Langkah 4: Perkenalkan menu Rekap Nilai —
      {
        target: '#sidebar-menu-rekap-nilai',
        title: '4. Rekap Nilai',
        content: 'Buka halaman Rekap Nilai untuk melihat rincian nilai akhir setiap siswa beserta pecahan skor PG & Essay-nya.'
      },
      // — Langkah 5: Sorot selector ujian di Rekap Nilai, jelas bahwa Preview POV muncul setelah pilih ujian —
      {
        route: '/guru/nilai',
        target: '#tour-select-rekap',
        title: '5. Pilih Ujian → Aktifkan Preview',
        content: 'Pilih ujian dari dropdown ini. Setelah ujian dipilih, tombol "Preview POV Siswa" 👁 akan muncul di area header atas — klik untuk mensimulasikan tampilan layar siswa!'
      }
    ]
  }
  if (authStore.role === 'admin') {
    return [
      // — Langkah 1: Perkenalkan menu Pengaturan —
      {
        target: '#sidebar-menu-pengaturan',
        title: '1. Menu Pengaturan',
        content: 'Buka halaman Pengaturan untuk mengonfigurasi parameter penilaian sistem, termasuk fitur bobot PG khusus per kelas yang baru.'
      },
      // — Langkah 2: Sorot tabel override bobot per kelas —
      {
        route: '/admin/settings',
        target: '#tour-tabel-override',
        title: '2. Tabel Bobot PG Per Kelas',
        content: 'Isi input nilai di sini untuk menetapkan bobot maksimum PG khusus per kelas (override). Kosongkan untuk mengikuti nilai global. Contoh: SMP diisi 80, SMA diisi 100.'
      },
      // — Langkah 3: Sorot accordion Audit & Hitung Ulang Nilai —
      {
        route: '/admin/settings',
        target: '#tour-accordion-audit',
        title: '3. Buka Panel Audit Nilai',
        content: 'Klik accordion "Audit & Hitung Ulang Nilai" ini untuk membuka panel scan adaptif. Anda bisa mendeteksi nilai siswa yang belum konsisten dengan pengaturan bobot kelas terbaru.'
      },
      // — Langkah 4: Sorot tombol Scan Audit Nilai —
      {
        route: '/admin/settings',
        target: '#tour-btn-scan-audit',
        title: '4. Scan Sekarang!',
        content: 'Klik tombol kuning ini untuk memulai pemindaian. Sistem akan menampilkan daftar nilai yang perlu diperbarui berdasarkan konfigurasi bobot kelas yang baru saja Anda atur.'
      }
    ]
  }
  return []
})

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
  const { isConfirmed } = await Swal.fire({
    title: 'Keluar dari Aplikasi?',
    text: 'Anda akan keluar dari sesi ini.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Keluar',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280'
  })
  if (!isConfirmed) return
  await authStore.logout()
  router.push('/login')
}

const isActive = (path) => route.path === path
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-venus-50">
    <!-- Sidebar -->
    <aside
      v-if="!hideSidebar"
      class="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-venus-100 bg-white shadow-venus transition-transform duration-300 ease-ios lg:static lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-full flex-col">
        <!-- Brand Header — mirrors Venus DrawerItems header -->
        <div class="sticky top-0 z-10 flex items-center gap-3 border-b border-venus-100 bg-white px-6 py-5">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-ios-sm ring-1 ring-venus-200"
          >
            <img src="/ATSLogo -trans.png" alt="Logo" class="h-full w-full object-contain" />
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
            :id="`sidebar-menu-${item.name.toLowerCase().replace(/\s+/g, '-')}`"
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
        v-if="!hideSidebar"
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
      <main :class="hideSidebar ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col'">
        <div :class="hideSidebar ? 'h-full' : 'flex-1'">
          <router-view />
        </div>

        <!-- Footer Watermark -->
        <footer v-if="!hideSidebar" class="mt-auto pt-8 text-center text-[11px] font-semibold tracking-wider text-venus-400 uppercase">
          &copy; {{ new Date().getFullYear() }} CBT Al Hikmah Tahfidz School - Sistem Ujian Berbasis Komputer
        </footer>
      </main>
    </div>

    <!-- Mobile overlay -->
    <div
      v-if="isSidebarOpen && !hideSidebar"
      class="fixed inset-0 z-40 bg-venus-900/20 backdrop-blur-[2px] lg:hidden"
      aria-hidden="true"
      @click="isSidebarOpen = false"
    />

    <!-- What's New Modal (For all roles) -->
    <WhatsNewModal 
      v-if="authStore.role" 
      :role="authStore.role" 
      @start-tour="isTourActive = true"
    />

    <!-- Guided Tour (Spotlight) -->
    <AppTour 
      v-if="tourSteps.length > 0"
      v-model="isTourActive"
      :steps="tourSteps"
    />
  </div>
</template>
