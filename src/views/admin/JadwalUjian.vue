<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { Clock, Trash2, Eye, CalendarDays, Search, User, Filter } from 'lucide-vue-next'
import { GlassCard, AppSelect, EmptyState } from '@/components/ui'
import PreviewExamModal from '@/components/guru/PreviewExamModal.vue'
import Swal from 'sweetalert2'
import { toast } from 'gooey-toast'

const loading = ref(true)
const ujianList = ref([])

const mapels = ref([])
const kelasList = ref([])
const gurus = ref([])

const filterMapel = ref('')
const filterKelas = ref('')
const filterGuru = ref('')
const searchQuery = ref('')

const isPreviewOpen = ref(false)
const previewUjianId = ref('')

const openPreview = (id) => {
  previewUjianId.value = id
  isPreviewOpen.value = true
}

const fetchData = async () => {
  loading.value = true
  
  // Fetch referensi untuk dropdown filter
  const [mapelRes, kelasRes, guruRes] = await Promise.all([
    supabase.from('mapel').select('id, nama').order('nama'),
    supabase.from('kelas').select('id, nama').order('nama'),
    supabase.from('profiles').select('id, full_name').eq('role', 'guru').order('full_name')
  ])
  mapels.value = mapelRes.data || []
  kelasList.value = kelasRes.data || []
  gurus.value = guruRes.data || []

  // Fetch seluruh ujian
  const { data, error } = await supabase
    .from('ujian')
    .select(`
      id, nama, durasi, tanggal_mulai, tanggal_selesai, status, acak_soal,
      mapel:mapel_id(id, nama),
      kelas:kelas_id(id, nama),
      guru:guru_id(id, full_name)
    `)
    .order('tanggal_mulai', { ascending: false })

  if (error) {
    toast.error({ title: 'Error', description: error.message })
  } else {
    ujianList.value = data || []
  }
  loading.value = false
}

onMounted(fetchData)

// Helper: Menentukan status efektif berdasarkan waktu
const getEffectiveStatus = (ujian) => {
  if (ujian.status === 'draft') return { label: 'Draft', badge: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' }
  const now = new Date()
  const start = new Date(ujian.tanggal_mulai)
  const end = new Date(ujian.tanggal_selesai)
  if (now < start) return { label: 'Menunggu', badge: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' }
  if (now > end) return { label: 'Selesai', badge: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' }
  return { label: 'Live', badge: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' }
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date)
}

// Computed Filter
const filteredUjian = computed(() => {
  return ujianList.value.filter(u => {
    const matchSearch = u.nama?.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchMapel = filterMapel.value ? u.mapel?.id === filterMapel.value : true
    const matchKelas = filterKelas.value ? u.kelas?.id === filterKelas.value : true
    const matchGuru = filterGuru.value ? u.guru?.id === filterGuru.value : true
    return matchSearch && matchMapel && matchKelas && matchGuru
  })
})

const handleDelete = async (ujian) => {
  const result = await Swal.fire({
    title: 'Hapus Jadwal Ujian?',
    text: `Ujian "${ujian.nama}" akan dihapus permanen.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e31a1a',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal'
  })

  if (result.isConfirmed) {
    const { error } = await supabase.from('ujian').delete().eq('id', ujian.id)
    if (error) {
      toast.error({ title: 'Gagal', description: error.message })
    } else {
      toast.success({ title: 'Berhasil dihapus' })
      fetchData()
    }
  }
}
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900">Jadwal Ujian</h1>
        <p class="mt-1 text-sm text-venus-400">Pantau seluruh ujian yang dibuat oleh guru.</p>
      </div>
    </div>

    <!-- Filters -->
    <GlassCard padding="p-4">
      <div class="flex flex-col gap-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" :size="16" />
            <input v-model="searchQuery" type="text" placeholder="Cari nama ujian..." class="form-input pl-9 text-sm" />
          </div>
          <!-- Filter Guru -->
          <AppSelect
            v-model="filterGuru"
            placeholder="Semua Guru"
            :options="gurus.map(g => ({ value: g.id, label: g.full_name }))"
            class="sm:w-44"
          />
          <!-- Filter Kelas -->
          <AppSelect
            v-model="filterKelas"
            placeholder="Semua Kelas"
            :options="kelasList.map(k => ({ value: k.id, label: k.nama }))"
            class="sm:w-36"
          />
          <!-- Filter Mapel -->
          <AppSelect
            v-model="filterMapel"
            placeholder="Semua Mapel"
            :options="mapels.map(m => ({ value: m.id, label: m.nama }))"
            class="sm:w-44"
          />
        </div>
      </div>
    </GlassCard>

    <!-- Table / Card -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <!-- Loading skeleton -->
      <div v-if="loading" class="divide-y divide-venus-50">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-4 py-4 sm:px-6">
          <div class="h-4 w-32 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 flex-1 animate-pulse rounded-full bg-venus-100" />
          <div class="hidden h-4 w-24 animate-pulse rounded-full bg-venus-100 sm:block" />
          <div class="hidden h-4 w-20 animate-pulse rounded-full bg-venus-100 sm:block" />
        </div>
      </div>

      <!-- Empty -->
      <EmptyState
        v-else-if="filteredUjian.length === 0"
        title="Ujian Tidak Ditemukan"
        description="Belum ada ujian yang dibuat oleh guru, atau tidak ada yang sesuai dengan filter."
      />

      <template v-else>
        <!-- ===================== MOBILE CARD LIST (< md) ===================== -->
        <div class="divide-y divide-venus-50 md:hidden">
          <div
            v-for="ujian in filteredUjian"
            :key="ujian.id"
            class="px-4 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    class="inline-flex rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    :class="getEffectiveStatus(ujian).badge"
                  >
                    {{ getEffectiveStatus(ujian).label }}
                  </span>
                </div>
                <p class="font-semibold text-venus-800 text-sm leading-snug">{{ ujian.nama }}</p>
                <div class="flex items-center gap-1.5 text-xs text-venus-600 mt-1">
                  <User :size="12" /> <span class="font-medium truncate">{{ ujian.guru?.full_name || '—' }}</span>
                </div>
                <p class="text-xs text-venus-400 mt-0.5">
                  {{ ujian.mapel?.nama || '—' }} · {{ ujian.kelas?.nama || '—' }}
                </p>
                <div class="flex items-center gap-1 text-xs text-venus-400 mt-1">
                  <Clock :size="11" />
                  {{ ujian.durasi }} mnt · {{ formatDate(ujian.tanggal_mulai) }}
                </div>
              </div>
              <!-- Aksi -->
              <div class="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  @click="openPreview(ujian.id)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-2 text-venus-400 shadow-ios-sm hover:text-amber-500 active:opacity-70"
                  title="Preview Ujian"
                >
                  <Eye :size="15" />
                </button>
                <button
                  type="button"
                  @click="handleDelete(ujian)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-2 text-venus-400 shadow-ios-sm hover:text-red-500 active:opacity-70"
                  title="Hapus Ujian"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ===================== DESKTOP TABLE (md+) ===================== -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr class="border-b border-venus-100 bg-venus-50/60">
                <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Nama Ujian</th>
                <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Guru</th>
                <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Mapel / Kelas</th>
                <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Durasi</th>
                <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Mulai</th>
                <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Status</th>
                <th class="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-venus-400">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-venus-50">
              <tr v-for="ujian in filteredUjian" :key="ujian.id" class="transition-colors hover:bg-venus-50/50">
                <td class="max-w-[250px] px-6 py-4 whitespace-normal">
                  <p class="font-medium text-venus-800 line-clamp-2" :title="ujian.nama">{{ ujian.nama }}</p>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-1.5 text-venus-700 font-medium">
                    <User :size="14" class="text-venus-400 shrink-0" />
                    <span class="truncate">{{ ujian.guru?.full_name || '—' }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <p class="text-venus-700 font-medium">{{ ujian.mapel?.nama || '—' }}</p>
                  <p class="text-[11px] text-venus-400">{{ ujian.kelas?.nama || '—' }}</p>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-venus-500 flex items-center gap-1">
                      <Clock :size="12" class="shrink-0" /> {{ ujian.durasi }} mnt
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-venus-500 text-xs font-mono">{{ formatDate(ujian.tanggal_mulai) }}</td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                    :class="getEffectiveStatus(ujian).badge"
                  >
                    {{ getEffectiveStatus(ujian).label }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      @click="openPreview(ujian.id)"
                      class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:text-amber-500 active:opacity-70"
                      title="Preview Ujian"
                    >
                      <Eye :size="15" />
                    </button>
                    <button
                      type="button"
                      @click="handleDelete(ujian)"
                      class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:text-red-500 active:opacity-70"
                      title="Hapus Ujian"
                    >
                      <Trash2 :size="15" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </GlassCard>

    <!-- Preview Modal POV Siswa -->
    <PreviewExamModal
      :isOpen="isPreviewOpen"
      :ujianId="previewUjianId"
      @close="isPreviewOpen = false"
    />
  </div>
</template>
