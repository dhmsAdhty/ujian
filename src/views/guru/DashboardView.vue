<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import {
  FileStack, Plus, BookOpen, ClipboardList,
  LayoutList, FileText, Edit, ArrowRight, TrendingUp
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, EmptyState } from '@/components/ui'
import StatCard from '@/components/admin/StatCard.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const totalSoal = ref(0)
const totalMapel = ref(0)
const totalUjian = ref(0)
const recentSoal = ref([])

const stats = computed(() => [
  { title: 'Total Soal', value: totalSoal.value, icon: FileStack, color: 'primary' },
  { title: 'Mata Pelajaran', value: totalMapel.value, icon: BookOpen, color: 'blue' },
  { title: 'Ujian Dibuat', value: totalUjian.value, icon: ClipboardList, color: 'emerald' },
])

onMounted(async () => {
  if (!authStore.user) return
  const guruId = authStore.user.id

  const [soalRes, mapelRes, ujianRes, recentRes] = await Promise.all([
    supabase
      .from('bank_soal')
      .select('*', { count: 'exact', head: true })
      .eq('guru_id', guruId)
      .is('deleted_at', null),
    supabase
      .from('bank_soal')
      .select('mapel_id', { count: 'exact' })
      .eq('guru_id', guruId)
      .is('deleted_at', null),
    supabase
      .from('ujian')
      .select('*', { count: 'exact', head: true })
      .eq('guru_id', guruId),
    supabase
      .from('bank_soal')
      .select('id, judul, tipe_soal, created_at, mapel(nama)')
      .eq('guru_id', guruId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  totalSoal.value = soalRes.count || 0

  // Count distinct mapel_id
  const mapelIds = new Set((mapelRes.data || []).map(r => r.mapel_id).filter(Boolean))
  totalMapel.value = mapelIds.size

  totalUjian.value = ujianRes.count || 0
  recentSoal.value = recentRes.data || []

  loading.value = false
})
</script>

<template>
  <div class="animate-fade-in space-y-8">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-venus-900">
          Selamat datang, {{ authStore.user?.user_metadata?.full_name?.split(' ')[0] || 'Guru' }} 👋
        </h1>
        <p class="mt-1 text-sm text-venus-500">Kelola soal dan pantau aktivitas mengajar Anda.</p>
      </div>
      <PrimaryButton @click="router.push('/guru/soal/tambah')" class="shadow-primary-500/20">
        <Plus :size="18" />
        Buat Soal Baru
      </PrimaryButton>
    </div>

    <!-- Stat Cards -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-28 animate-pulse rounded-2xl bg-venus-100" />
    </div>
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard v-for="stat in stats" :key="stat.title" v-bind="stat" />
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Recent Soal -->
      <div class="lg:col-span-2">
        <GlassCard padding="p-6">
          <div class="mb-5 flex items-center justify-between">
            <h3 class="font-semibold tracking-tight text-venus-900">Soal Terbaru</h3>
            <button
              type="button"
              class="text-sm font-medium text-primary-600 transition-opacity active:opacity-70"
              @click="router.push('/guru/soal')"
            >
              Lihat semua
            </button>
          </div>

          <!-- Skeleton -->
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-xl bg-venus-50" />
          </div>

          <!-- Empty -->
          <EmptyState
            v-else-if="recentSoal.length === 0"
            title="Belum ada soal"
            description="Mulai buat soal pertama Anda untuk bank soal."
          >
            <template #action>
              <PrimaryButton @click="router.push('/guru/soal/tambah')">
                Buat Soal Pertama
              </PrimaryButton>
            </template>
          </EmptyState>

          <!-- List -->
          <div v-else class="divide-y divide-venus-50">
            <div
              v-for="soal in recentSoal"
              :key="soal.id"
              class="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                :class="soal.tipe_soal === 'pilihan_ganda' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'"
              >
                <component :is="soal.tipe_soal === 'pilihan_ganda' ? LayoutList : FileText" :size="20" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-venus-800">{{ soal.judul }}</p>
                <p class="text-xs text-venus-400">
                  {{ soal.mapel?.nama || 'Umum' }} ·
                  {{ new Date(soal.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                </p>
              </div>
              <button
                type="button"
                class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-2 text-venus-400 shadow-ios-sm transition-[transform,opacity] duration-200 ease-ios active:opacity-70"
                @click="router.push(`/guru/soal/edit/${soal.id}`)"
                aria-label="Edit soal"
              >
                <Edit :size="16" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- Quick Actions -->
      <div class="space-y-4">
        <GlassCard padding="p-6">
          <h3 class="mb-4 font-semibold tracking-tight text-venus-900">Aksi Cepat</h3>
          <div class="space-y-3">
            <button
              type="button"
              class="pressable-soft flex w-full items-center gap-3 rounded-xl border border-venus-200/80 bg-white px-4 py-3 text-left shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-50"
              @click="router.push('/guru/soal/tambah')"
            >
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Plus :size="18" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-venus-800">Buat Soal Baru</p>
                <p class="text-xs text-venus-400">Pilihan ganda atau essay</p>
              </div>
              <ArrowRight :size="16" class="shrink-0 text-venus-300" />
            </button>

            <button
              type="button"
              class="pressable-soft flex w-full items-center gap-3 rounded-xl border border-venus-200/80 bg-white px-4 py-3 text-left shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-50"
              @click="router.push('/guru/soal')"
            >
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <FileStack :size="18" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-venus-800">Bank Soal Saya</p>
                <p class="text-xs text-venus-400">Kelola semua soal</p>
              </div>
              <ArrowRight :size="16" class="shrink-0 text-venus-300" />
            </button>

            <button
              type="button"
              class="pressable-soft flex w-full items-center gap-3 rounded-xl border border-venus-200/80 bg-white px-4 py-3 text-left shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-50"
              @click="router.push('/guru/nilai')"
            >
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <TrendingUp :size="18" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-venus-800">Rekap Nilai</p>
                <p class="text-xs text-venus-400">Lihat hasil ujian siswa</p>
              </div>
              <ArrowRight :size="16" class="shrink-0 text-venus-300" />
            </button>
          </div>
        </GlassCard>

        <!-- Tip Card -->
        <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 to-primary-500 p-5 text-white shadow-ios-lg shadow-primary-500/20">
          <div class="pointer-events-none absolute -bottom-4 -right-4 opacity-10">
            <FileStack :size="100" stroke-width="1.25" />
          </div>
          <p class="mb-1 text-xs font-bold uppercase tracking-widest opacity-70">Tips</p>
          <p class="text-sm font-medium leading-relaxed opacity-90">
            Gunakan fitur Import Massal di Bank Soal untuk mengunggah banyak soal sekaligus via Excel.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
