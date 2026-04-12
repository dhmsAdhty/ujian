<script setup>
import { ref, onMounted, watch } from 'vue'
import { useBankSoal } from '@/composables/useBankSoal'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Edit, 
  FileText, 
  LayoutList,
  ChevronLeft,
  ChevronRight,
  FileDown
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, EmptyState, AppSelect } from '@/components/ui'
import MassImportModal from '@/components/guru/MassImportModal.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { items, loading, totalItems, fetchGuruSoal, softDeleteSoal } = useBankSoal()

// Filters state
const searchQuery = ref('')
const typeFilter = ref('')
const mapelFilter = ref('')
const page = ref(1)
const showImportModal = ref(false)

const fetchData = () => {
  fetchGuruSoal({
    page: page.value,
    search: searchQuery.value,
    tipe: typeFilter.value,
    mapelId: mapelFilter.value
  })
}

onMounted(fetchData)

// Debounced search
let searchTimeout
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchData()
  }, 500)
})

watch([typeFilter, mapelFilter, page], fetchData)

const handleDelete = async (id) => {
  const success = await softDeleteSoal(id)
  if (success) fetchData()
}
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header Area -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-venus-900">Bank soal saya</h1>
        <p class="mt-1 text-sm text-venus-500">Kelola perbendaharaan soal mata pelajaran Anda.</p>
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          @click="showImportModal = true"
          class="pressable-soft flex items-center gap-2 rounded-xl border border-venus-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-venus-700 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100"
        >
          <FileDown :size="18" />
          Import Massal
        </button>
        <PrimaryButton @click="router.push('/guru/soal/tambah')" class="shadow-xl">
          <Plus :size="18" />
          Buat Soal
        </PrimaryButton>
      </div>
    </div>

    <!-- Filters -->
    <GlassCard padding="p-4">
      <div class="flex flex-col lg:flex-row gap-4 items-center">
        <div class="w-full lg:flex-1">
          <FormInput 
            v-model="searchQuery"
            placeholder="Cari judul soal..."
            :icon="Search"
          />
        </div>
        <div class="flex gap-3 w-full lg:w-auto">
          <AppSelect
            v-model="typeFilter"
            placeholder="Semua Tipe"
            :options="[
              { value: 'pilihan_ganda', label: 'Pilihan Ganda' },
              { value: 'essay', label: 'Essay' }
            ]"
            class="lg:w-44"
          />
          <button
            type="button"
            class="pressable-soft rounded-xl bg-venus-100 p-2.5 text-venus-600 transition-[background-color,transform] duration-200 ease-ios active:bg-venus-200"
          >
            <Filter :size="20" />
          </button>
        </div>
      </div>
    </GlassCard>

    <!-- Content Grid/List -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-for="i in 4" :key="i" class="glass-card p-6 h-48 animate-pulse"></div>
    </div>

    <div v-else-if="items.length === 0">
      <EmptyState 
        title="Kotak Soal Kosong"
        description="Anda belum memiliki koleksi soal. Mulai buat soal pertama Anda sekarang."
      >
        <template #action>
          <PrimaryButton @click="router.push('/guru/soal/tambah')">
            Buat Soal Pertama
          </PrimaryButton>
        </template>
      </EmptyState>
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard
          v-for="soal in items"
          :key="soal.id"
          class="relative overflow-hidden"
          padding="p-6"
        >
          <!-- Type Badge -->
          <div class="absolute top-0 right-0 p-4">
            <span 
              class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
              :class="soal.tipe_soal === 'pilihan_ganda' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'"
            >
              {{ soal.tipe_soal === 'pilihan_ganda' ? 'PG' : 'ESSAY' }}
            </span>
          </div>

          <div class="flex items-start gap-4">
            <div 
              class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              :class="soal.tipe_soal === 'pilihan_ganda' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'"
            >
              <component :is="soal.tipe_soal === 'pilihan_ganda' ? LayoutList : FileText" :size="24" />
            </div>

            <div class="flex-1 min-w-0 pr-10">
              <h3 class="truncate text-lg font-semibold leading-tight text-venus-900">
                {{ soal.judul }}
              </h3>
              
              <div class="flex items-center gap-4 mt-3">
                <div class="flex flex-col">
                  <span class="text-[10px] uppercase font-bold text-venus-400 tracking-widest">Mata Pelajaran</span>
                  <span class="text-sm font-bold text-venus-600">{{ soal.mapels?.nama || 'Umum' }}</span>
                </div>
                <div class="w-[1px] h-6 bg-venus-100"></div>
                <div class="flex flex-col">
                  <span class="text-[10px] uppercase font-bold text-venus-400 tracking-widest">Kelas</span>
                  <span class="text-sm font-bold text-venus-600">{{ soal.kelas?.nama || 'Semua' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-venus-50 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-venus-400">
                Dibuat {{ new Date(soal.created_at).toLocaleDateString('id-ID') }}
              </span>
            </div>
            
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="router.push(`/guru/soal/edit/${soal.id}`)"
                class="pressable-soft rounded-xl border border-venus-200/80 bg-white p-2 text-venus-500 shadow-ios-sm transition-[transform,opacity] duration-200 ease-ios active:opacity-80"
                aria-label="Edit soal"
              >
                <Edit :size="18" />
              </button>
              <button
                type="button"
                @click="handleDelete(soal.id)"
                class="pressable-soft rounded-xl border border-venus-200/80 bg-white p-2 text-venus-500 shadow-ios-sm transition-[transform,opacity] duration-200 ease-ios active:text-red-600"
                aria-label="Hapus soal"
              >
                <Trash2 :size="18" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-center gap-3 pt-6">
        <button
          type="button"
          @click="page--"
          :disabled="page === 1"
          class="pressable-soft rounded-xl border border-venus-200/90 bg-white p-2.5 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100 disabled:opacity-40 disabled:active:scale-100"
        >
          <ChevronLeft :size="20" />
        </button>
        <div class="px-5 py-2.5 bg-white border border-venus-200 rounded-xl font-bold text-venus-700">
          Halaman {{ page }}
        </div>
        <button
          type="button"
          @click="page++"
          :disabled="page * 10 >= totalItems"
          class="pressable-soft rounded-xl border border-venus-200/90 bg-white p-2.5 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100 disabled:opacity-40 disabled:active:scale-100"
        >
          <ChevronRight :size="20" />
        </button>
      </div>
    </div>

    <!-- Modals -->
    <MassImportModal 
      :show="showImportModal"
      @close="showImportModal = false"
      @success="showImportModal = false; fetchData()"
    />
  </div>
</template>
