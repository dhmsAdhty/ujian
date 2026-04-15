<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/services/supabase'
import { Trash2, RotateCcw, AlertTriangle, AlertCircle, FileStack } from 'lucide-vue-next'
import { GlassCard } from '@/components/ui'
import Swal from 'sweetalert2'

const trashItems = ref([])
const loading = ref(true)

const fetchTrash = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('bank_soal')
      .select('id, judul, tipe_soal, deleted_at, mapel(nama), profiles(full_name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })

    if (error) throw error
    trashItems.value = data || []
  } catch (error) {
    console.error('Error fetching trash:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchTrash)

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const restoreItem = async (id, judul) => {
  const confirm = await Swal.fire({
    title: 'Pulihkan Soal?',
    text: `"${judul}" akan dikembalikan ke bank soal aktif.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Pulihkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#3b82f6'
  })

  if (!confirm.isConfirmed) return

  const { error } = await supabase
    .from('bank_soal')
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) {
    Swal.fire('Gagal', error.message, 'error')
  } else {
    Swal.fire({ icon: 'success', title: 'Berhasil dipulihkan', timer: 1500, showConfirmButton: false })
    fetchTrash()
  }
}

const hardDelete = async (id, judul) => {
  const confirm = await Swal.fire({
    title: 'Hapus Permanen?',
    text: `Warning: "${judul}" akan dihapus selamanya dari sistem dan tidak bisa dikembalikan!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus Permanen',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444'
  })

  if (!confirm.isConfirmed) return

  const { error } = await supabase
    .from('bank_soal')
    .delete()
    .eq('id', id)

  if (error) {
    Swal.fire('Gagal', error.message, 'error')
  } else {
    Swal.fire({ icon: 'success', title: 'Berhasil dihapus permanen', timer: 1500, showConfirmButton: false })
    fetchTrash()
  }
}

const restoreAll = async () => {
  if (trashItems.value.length === 0) return
  const confirm = await Swal.fire({
    title: 'Pulihkan Semua?',
    text: `Semua soal yang di tempat sampah akan dikembalikan.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Pulihkan Semua',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#3b82f6'
  })

  if (!confirm.isConfirmed) return

  const { error } = await supabase
    .from('bank_soal')
    .update({ deleted_at: null })
    .not('deleted_at', 'is', null)

  if (error) {
    Swal.fire('Gagal', error.message, 'error')
  } else {
    Swal.fire({ icon: 'success', title: 'Semua soal dipulihkan', timer: 1500, showConfirmButton: false })
    fetchTrash()
  }
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900">Tempat Sampah Soal</h1>
        <p class="mt-1 text-sm text-venus-400">Soal-soal yang telah dihapus (soft-delete) oleh guru. Admin dapat memulihkan atau merestorasi soal tersebut.</p>
      </div>
      <div>
        <button
          v-if="trashItems.length > 0"
          @click="restoreAll"
          class="inline-flex items-center gap-2 pressable-soft px-4 py-2 rounded-xl bg-primary-50 border border-primary-200 text-sm font-semibold text-primary-700 shadow-ios-sm hover:bg-primary-100 outline-none transition-colors"
        >
          <RotateCcw :size="16" />
          Pulihkan Semua
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <GlassCard v-for="i in 6" :key="i" padding="p-5" class="animate-pulse flex flex-col gap-4">
        <div class="flex gap-3">
          <div class="w-10 h-10 bg-venus-100 rounded-lg shrink-0"></div>
          <div class="flex-1 space-y-2 py-1">
            <div class="w-3/4 h-4 bg-venus-100 rounded"></div>
            <div class="w-1/2 h-3 bg-venus-100 rounded"></div>
          </div>
        </div>
        <div class="mt-auto pt-4 border-t border-venus-50 flex gap-2">
          <div class="h-8 bg-venus-100 rounded-lg flex-1"></div>
          <div class="h-8 w-10 bg-venus-100 rounded-lg"></div>
        </div>
      </GlassCard>
    </div>
      
    <!-- Empty State -->
    <GlassCard v-else-if="trashItems.length === 0" class="p-16 flex flex-col items-center justify-center text-center">
      <div class="w-16 h-16 bg-emerald-50 text-emerald-400 flex items-center justify-center rounded-full mb-4">
        <Trash2 :size="32" />
      </div>
      <h3 class="text-base font-bold text-venus-700">Tempat Sampah Kosong</h3>
      <p class="text-sm text-venus-400 mt-1 max-w-sm">Tidak ada soal yang telah dihapus tersisa di sini.</p>
    </GlassCard>

    <!-- Cards Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      <GlassCard 
        v-for="item in trashItems" 
        :key="item.id" 
        padding="p-5" 
        class="flex flex-col hover:border-venus-300 transition-colors"
      >
        <div class="flex items-start gap-3 mb-4">
          <div class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 text-red-500 border border-red-100">
            <FileStack :size="18" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-venus-900 truncate mb-1.5" :title="item.judul || 'Tanpa Judul'">
              {{ item.judul || 'Tanpa Judul' }}
            </h3>
            <div class="flex flex-wrap items-center gap-1.5 mb-2">
              <span class="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-venus-100 text-venus-600">
                {{ item.tipe_soal === 'pilihan_ganda' ? 'PG' : item.tipe_soal === 'essay' ? 'ESSAY' : 'PG-K' }}
              </span>
              <span v-if="item.mapel?.nama" class="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                {{ item.mapel.nama }}
              </span>
            </div>
            <p class="text-[11px] text-venus-500">
              Dihapus: <span class="font-semibold text-venus-700">{{ item.profiles?.full_name || 'Desknonim' }}</span>
            </p>
          </div>
        </div>
        
        <div class="mt-auto pt-4 border-t border-venus-100 flex flex-col gap-3">
          <div class="flex items-center gap-1.5 text-[10px] text-red-500 font-medium">
            <AlertTriangle :size="12" />
            {{ formatTime(item.deleted_at) }}
          </div>
          
          <div class="flex items-center gap-2">
            <button
              @click="restoreItem(item.id, item.judul)"
              class="flex-1 justify-center inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors shadow-ios-sm"
            >
              <RotateCcw :size="14" /> Pulihkan
            </button>
            <button
              @click="hardDelete(item.id, item.judul)"
              class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-ios-sm shrink-0"
              title="Hapus Permanen"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
