<script setup>
import { ref, onMounted, watch } from 'vue'
import { useBankSoal } from '@/composables/useBankSoal'
import { Plus, Search, Trash2, Edit, ChevronLeft, ChevronRight, FileDown } from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, EmptyState, AppSelect } from '@/components/ui'
import MassImportModal from '@/components/guru/MassImportModal.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { items, loading, totalItems, fetchGuruSoal, softDeleteSoal } = useBankSoal()

const searchQuery = ref('')
const typeFilter = ref('')
const page = ref(1)
const showImportModal = ref(false)

const fetchData = () => {
  fetchGuruSoal({ page: page.value, pageSize: 25, search: searchQuery.value, tipe: typeFilter.value })
}

onMounted(fetchData)

let searchTimeout
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 1; fetchData() }, 500)
})

watch([typeFilter, page], fetchData)

const handleDelete = async (id) => {
  const success = await softDeleteSoal(id)
  if (success) fetchData()
}

const tipeBadge = (tipe) => {
  if (tipe === 'pilihan_ganda') return { label: 'PG', cls: 'bg-orange-50 text-orange-600 ring-1 ring-orange-100' }
  if (tipe === 'pilihan_ganda_kompleks') return { label: 'PG Kompleks', cls: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100' }
  return { label: 'Essay', cls: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' }
}
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-venus-900">Bank Soal Saya</h1>
        <p class="mt-1 text-sm text-venus-500">Kelola perbendaharaan soal mata pelajaran Anda.</p>
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          @click="showImportModal = true"
          class="pressable-soft flex items-center gap-2 rounded-xl border border-venus-200/90 bg-white px-4 py-2 text-sm font-semibold text-venus-700 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100"
        >
          <FileDown :size="16" />
          Import Massal
        </button>
        <PrimaryButton @click="router.push('/guru/soal/tambah')">
          <Plus :size="16" />
          Buat Soal
        </PrimaryButton>
      </div>
    </div>

    <!-- Filters -->
    <GlassCard padding="p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="flex-1">
          <FormInput v-model="searchQuery" placeholder="Cari soal..." :icon="Search" />
        </div>
        <AppSelect
          v-model="typeFilter"
          placeholder="Semua Tipe"
          :options="[
            { value: 'pilihan_ganda', label: 'Pilihan Ganda' },
            { value: 'pilihan_ganda_kompleks', label: 'PG Kompleks' },
            { value: 'essay', label: 'Essay' },
          ]"
          class="sm:w-48"
        />
      </div>
    </GlassCard>

    <!-- Table -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <!-- Skeleton -->
      <div v-if="loading" class="divide-y divide-venus-50">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-6 py-4">
          <div class="h-4 w-16 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 flex-1 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 w-24 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 w-20 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 w-16 animate-pulse rounded-full bg-venus-100" />
        </div>
      </div>

      <!-- Empty -->
      <EmptyState
        v-else-if="items.length === 0"
        title="Kotak Soal Kosong"
        description="Belum ada soal. Mulai buat soal pertama Anda."
      >
        <template #action>
          <PrimaryButton @click="router.push('/guru/soal/tambah')">Buat Soal Pertama</PrimaryButton>
        </template>
      </EmptyState>

      <!-- Table -->
      <table v-else class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-venus-100 bg-venus-50/60">
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Tipe</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Pertanyaan</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Mapel</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Kelas</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Dibuat</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-venus-50">
          <tr
            v-for="soal in items"
            :key="soal.id"
            class="group transition-colors hover:bg-venus-50/50"
          >
            <td class="px-6 py-4">
              <span
                class="inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                :class="tipeBadge(soal.tipe_soal).cls"
              >
                {{ tipeBadge(soal.tipe_soal).label }}
              </span>
            </td>
            <td class="max-w-xs px-6 py-4">
              <p class="truncate font-medium text-venus-800">{{ soal.konten || soal.judul }}</p>
            </td>
            <td class="px-6 py-4 text-venus-600">{{ soal.mapel?.nama || '—' }}</td>
            <td class="px-6 py-4 text-venus-600">{{ soal.kelas?.nama || '—' }}</td>
            <td class="px-6 py-4 text-venus-400">
              {{ new Date(soal.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  @click="router.push(`/guru/soal/edit/${soal.id}`)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-1.5 text-venus-400 shadow-ios-sm transition-[transform,opacity] duration-200 ease-ios hover:text-primary-600 active:opacity-70"
                  aria-label="Edit soal"
                >
                  <Edit :size="15" />
                </button>
                <button
                  type="button"
                  @click="handleDelete(soal.id)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-1.5 text-venus-400 shadow-ios-sm transition-[transform,opacity] duration-200 ease-ios hover:text-red-500 active:opacity-70"
                  aria-label="Hapus soal"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="!loading && items.length > 0" class="flex items-center justify-between border-t border-venus-100 px-6 py-4">
        <p class="text-xs text-venus-400">
          Menampilkan {{ (page - 1) * 25 + 1 }}–{{ Math.min(page * 25, totalItems) }} dari {{ totalItems }} soal
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="page--"
            :disabled="page === 1"
            class="pressable-soft rounded-lg border border-venus-200/90 bg-white p-2 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100 disabled:opacity-40"
          >
            <ChevronLeft :size="16" />
          </button>
          <span class="min-w-[60px] text-center text-sm font-semibold text-venus-700">{{ page }} / {{ Math.ceil(totalItems / 25) || 1 }}</span>
          <button
            type="button"
            @click="page++"
            :disabled="page * 25 >= totalItems"
            class="pressable-soft rounded-lg border border-venus-200/90 bg-white p-2 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100 disabled:opacity-40"
          >
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </GlassCard>

    <MassImportModal
      :show="showImportModal"
      @close="showImportModal = false"
      @success="showImportModal = false; fetchData()"
    />
  </div>
</template>
