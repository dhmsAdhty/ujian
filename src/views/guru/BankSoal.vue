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
import { GlassCard, PrimaryButton, FormInput, EmptyState } from '@/components/ui'
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
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Bank Soal Saya</h1>
        <p class="text-slate-500 mt-1">Kelola perbendaharaan soal mata pelajaran Anda.</p>
      </div>
      <div class="flex gap-3">
        <button 
          @click="showImportModal = true"
          class="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
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
          <select v-model="typeFilter" class="form-input lg:w-44 bg-white border-slate-200">
            <option value="">Semua Tipe</option>
            <option value="pilihan_ganda">Pilihan Ganda</option>
            <option value="essay">Essay</option>
          </select>
          <button class="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
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
          class="group relative overflow-hidden"
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
              <h3 class="font-bold text-slate-800 text-lg leading-tight truncate group-hover:text-primary-600 transition-colors">
                {{ soal.judul }}
              </h3>
              
              <div class="flex items-center gap-4 mt-3">
                <div class="flex flex-col">
                  <span class="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Mata Pelajaran</span>
                  <span class="text-sm font-bold text-slate-600">{{ soal.mapels?.nama || 'Umum' }}</span>
                </div>
                <div class="w-[1px] h-6 bg-slate-100"></div>
                <div class="flex flex-col">
                  <span class="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Kelas</span>
                  <span class="text-sm font-bold text-slate-600">{{ soal.kelas?.nama || 'Semua' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-slate-400">
                Dibuat {{ new Date(soal.created_at).toLocaleDateString('id-ID') }}
              </span>
            </div>
            
            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
              <button 
                @click="router.push(`/guru/soal/edit/${soal.id}`)"
                class="p-2 bg-white text-slate-500 hover:text-blue-600 hover:shadow-md rounded-xl transition-all border border-slate-100"
              >
                <Edit :size="18" />
              </button>
              <button 
                @click="handleDelete(soal.id)"
                class="p-2 bg-white text-slate-500 hover:text-red-600 hover:shadow-md rounded-xl transition-all border border-slate-100"
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
          @click="page--"
          :disabled="page === 1"
          class="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"
        >
          <ChevronLeft :size="20" />
        </button>
        <div class="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700">
          Halaman {{ page }}
        </div>
        <button 
          @click="page++"
          :disabled="page * 10 >= totalItems"
          class="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all"
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
