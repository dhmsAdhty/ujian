<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { BookOpen, Plus, FileDown, ChevronRight, FileStack } from 'lucide-vue-next'
import { GlassCard, PrimaryButton, EmptyState } from '@/components/ui'
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const mapelList = ref([])

onMounted(async () => {
  if (!authStore.user) return

  // Ambil semua soal guru, group by mapel
  const { data, error } = await supabase
    .from('bank_soal')
    .select('mapel_id, mapel(id, nama)')
    .eq('guru_id', authStore.user.id)
    .is('deleted_at', null)

  if (!error && data) {
    // Group dan hitung per mapel
    const map = {}
    data.forEach(row => {
      const id = row.mapel_id
      if (!id) return
      if (!map[id]) map[id] = { id, nama: row.mapel?.nama || '—', count: 0 }
      map[id].count++
    })
    mapelList.value = Object.values(map).sort((a, b) => a.nama.localeCompare(b.nama))
  }

  loading.value = false
})
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-venus-900">Bank Soal</h1>
        <p class="mt-1 text-sm text-venus-500">Pilih mata pelajaran untuk mengelola soal.</p>
      </div>
      <div class="flex gap-3">
        <PrimaryButton @click="router.push('/guru/soal/tambah')">
          <Plus :size="16" />
          Buat Soal
        </PrimaryButton>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 4" :key="i" class="h-28 animate-pulse rounded-2xl bg-venus-100" />
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="mapelList.length === 0"
      title="Belum Ada Soal"
      description="Mulai buat soal pertama Anda untuk mengisi bank soal."
    >
      <template #action>
        <PrimaryButton @click="router.push('/guru/soal/tambah')">Buat Soal Pertama</PrimaryButton>
      </template>
    </EmptyState>

    <!-- Mapel Cards -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="mapel in mapelList"
        :key="mapel.id"
        type="button"
        @click="router.push(`/guru/soal/mapel/${mapel.id}`)"
        class="pressable-soft group flex items-center gap-4 rounded-2xl border border-venus-100 bg-white p-5 text-left shadow-ios-sm transition-all duration-200 ease-ios hover:border-primary-200 hover:shadow-ios-md active:scale-[0.98]"
      >
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
          <BookOpen :size="22" stroke-width="2" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-venus-900">{{ mapel.nama }}</p>
          <p class="mt-0.5 flex items-center gap-1 text-xs text-venus-400">
            <FileStack :size="12" />
            {{ mapel.count }} soal
          </p>
        </div>
        <ChevronRight :size="18" class="shrink-0 text-venus-300 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  </div>
</template>
