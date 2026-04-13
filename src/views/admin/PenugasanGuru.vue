<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { GraduationCap, BookOpen, Plus, Search, X, UserCheck, Layers } from 'lucide-vue-next'
import { GlassCard, PrimaryButton, EmptyState, AppSelect } from '@/components/ui'
import Swal from 'sweetalert2'

const gurus = ref([])
const mapels = ref([])
const assignments = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showModal = ref(false)
const selectedGuru = ref(null)
const selectedMapelId = ref('')
const saving = ref(false)
const isMounted = ref(true)

const fetchAll = async () => {
  loading.value = true
  const [guruRes, mapelRes, assignRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('role', 'guru').order('full_name'),
    supabase.from('mapel').select('id, nama').order('nama'),
    supabase.from('guru_mapel').select('id, guru_id, mapel_id'),
  ])
  if (!isMounted.value) return
  gurus.value = guruRes.data || []
  mapels.value = mapelRes.data || []
  assignments.value = assignRes.error ? [] : (assignRes.data || [])
  loading.value = false
}

onMounted(fetchAll)
onBeforeUnmount(() => { isMounted.value = false; showModal.value = false })

const filteredGurus = computed(() => {
  if (!searchQuery.value) return gurus.value
  const q = searchQuery.value.toLowerCase()
  return gurus.value.filter((g) => g.full_name?.toLowerCase().includes(q))
})

const assignedMapels = (guruId) => {
  const ids = assignments.value.filter((a) => a.guru_id === guruId).map((a) => a.mapel_id)
  return mapels.value.filter((m) => ids.includes(m.id))
}

const availableMapels = computed(() => {
  if (!selectedGuru.value) return []
  const assigned = assignments.value.filter((a) => a.guru_id === selectedGuru.value.id).map((a) => a.mapel_id)
  return mapels.value.filter((m) => !assigned.includes(m.id)).map((m) => ({ value: m.id, label: m.nama }))
})

const openModal = (guru) => {
  selectedGuru.value = guru
  selectedMapelId.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedGuru.value = null
  selectedMapelId.value = ''
}

const handleAssign = async () => {
  if (!selectedMapelId.value || !selectedGuru.value) return
  saving.value = true
  const { error } = await supabase.from('guru_mapel').insert({
    guru_id: selectedGuru.value.id,
    mapel_id: selectedMapelId.value,
  })
  saving.value = false
  if (error) {
    Swal.fire('Gagal', error.message.includes('does not exist')
      ? 'Tabel guru_mapel belum dibuat. Jalankan SQL di Supabase terlebih dahulu.'
      : error.message, 'error')
  } else {
    selectedMapelId.value = ''
    await fetchAll()
  }
}

const handleRemove = async (guruId, mapelId, mapelNama) => {
  const result = await Swal.fire({
    title: 'Hapus penugasan?',
    text: `Guru tidak lagi mengampu "${mapelNama}".`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e31a1a',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
  })
  if (!result.isConfirmed) return
  const { error } = await supabase.from('guru_mapel').delete().eq('guru_id', guruId).eq('mapel_id', mapelId)
  if (error) Swal.fire('Gagal', error.message, 'error')
  else fetchAll()
}

const initials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

const avatarColor = (name) => {
  const c = ['bg-primary-100 text-primary-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700']
  return c[(name?.charCodeAt(0) || 0) % c.length]
}

const badgeColor = (nama) => {
  const c = ['bg-primary-50 text-primary-700 ring-1 ring-primary-100', 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100', 'bg-amber-50 text-amber-700 ring-1 ring-amber-100', 'bg-blue-50 text-blue-700 ring-1 ring-blue-100', 'bg-purple-50 text-purple-700 ring-1 ring-purple-100', 'bg-rose-50 text-rose-700 ring-1 ring-rose-100']
  return c[(nama?.charCodeAt(0) || 0) % c.length]
}
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900">Penugasan Guru</h1>
        <p class="mt-1 text-sm text-venus-400">Tugaskan guru untuk mengampu satu atau lebih mata pelajaran.</p>
      </div>
      <div class="flex gap-3">
        <div class="flex items-center gap-2 rounded-xl border border-venus-100 bg-white px-4 py-2 shadow-ios-sm">
          <GraduationCap :size="15" class="text-primary-600" />
          <span class="text-sm font-semibold text-venus-700">{{ gurus.length }} Guru</span>
        </div>
        <div class="flex items-center gap-2 rounded-xl border border-venus-100 bg-white px-4 py-2 shadow-ios-sm">
          <BookOpen :size="15" class="text-emerald-600" />
          <span class="text-sm font-semibold text-venus-700">{{ mapels.length }} Mapel</span>
        </div>
      </div>
    </div>

    <!-- Search -->
    <GlassCard padding="p-4">
      <div class="relative">
        <Search :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-venus-400" />
        <input v-model="searchQuery" type="search" placeholder="Cari nama guru..." class="form-input pl-10" />
      </div>
    </GlassCard>

    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-44 animate-pulse rounded-2xl bg-venus-100" />
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="filteredGurus.length === 0"
      title="Tidak Ada Guru"
      description="Belum ada akun dengan role guru. Tambahkan guru di Manajemen User terlebih dahulu."
    />

    <!-- Grid cards -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <GlassCard
        v-for="guru in filteredGurus"
        :key="guru.id"
        padding="p-5"
        hover
        class="flex flex-col gap-4"
      >
        <!-- Top: avatar + info -->
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black"
            :class="avatarColor(guru.full_name)"
          >
            {{ initials(guru.full_name) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-venus-900">{{ guru.full_name }}</p>
            <p class="truncate text-xs text-venus-400">{{ guru.email }}</p>
          </div>
          <!-- mapel count -->
          <span
            class="shrink-0 rounded-lg px-2 py-1 text-xs font-black"
            :class="assignedMapels(guru.id).length > 0 ? 'bg-primary-50 text-primary-700' : 'bg-venus-100 text-venus-400'"
          >
            {{ assignedMapels(guru.id).length }}
          </span>
        </div>

        <!-- Mapel badges -->
        <div class="min-h-[36px]">
          <div v-if="assignedMapels(guru.id).length === 0" class="flex items-center gap-1.5 text-xs text-venus-400">
            <Layers :size="13" />
            Belum ada penugasan
          </div>
          <div v-else class="flex flex-wrap gap-1.5">
            <span
              v-for="mapel in assignedMapels(guru.id)"
              :key="mapel.id"
              class="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
              :class="badgeColor(mapel.nama)"
            >
              {{ mapel.nama }}
            </span>
          </div>
        </div>

        <!-- Action -->
        <button
          type="button"
          class="pressable-soft mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl border border-venus-200 bg-white py-2 text-sm font-semibold text-venus-700 shadow-ios-sm transition-colors hover:border-primary-200 hover:text-primary-600"
          @click="openModal(guru)"
        >
          <Plus :size="14" />
          Kelola Penugasan
        </button>
      </GlassCard>
    </div>

    <!-- Modal -->
    <div
      v-if="showModal && isMounted"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      @mousedown.self="closeModal"
    >
      <div class="absolute inset-0 bg-venus-900/40 backdrop-blur-sm" @click="closeModal" />

      <div class="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-venus-100 bg-white shadow-venus">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-venus-100 px-6 py-5">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <UserCheck :size="18" />
            </div>
            <div>
              <h3 class="text-base font-bold text-venus-900">Kelola Penugasan</h3>
              <p class="text-xs text-venus-400">{{ selectedGuru?.full_name }}</p>
            </div>
          </div>
          <button type="button" class="pressable-soft rounded-lg p-1.5 text-venus-400 hover:bg-venus-100" @click="closeModal">
            <X :size="18" />
          </button>
        </div>

        <!-- Body -->
        <div class="space-y-5 px-6 py-6">
          <!-- Sudah ditugaskan -->
          <div>
            <p class="mb-2.5 text-[11px] font-black uppercase tracking-widest text-venus-400">
              Sudah Ditugaskan
            </p>
            <div
              v-if="!selectedGuru || assignedMapels(selectedGuru.id).length === 0"
              class="rounded-xl border border-dashed border-venus-200 bg-venus-50 py-4 text-center text-sm text-venus-400"
            >
              Belum ada mapel yang ditugaskan
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <div
                v-for="mapel in assignedMapels(selectedGuru.id)"
                :key="mapel.id"
                class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                :class="badgeColor(mapel.nama)"
              >
                <BookOpen :size="11" />
                {{ mapel.nama }}
                <button
                  type="button"
                  class="ml-0.5 rounded opacity-40 transition-opacity hover:opacity-100"
                  @click="handleRemove(selectedGuru.id, mapel.id, mapel.nama)"
                >
                  <X :size="11" />
                </button>
              </div>
            </div>
          </div>

          <div class="border-t border-venus-100" />

          <!-- Tambah -->
          <div>
            <p class="mb-2.5 text-[11px] font-black uppercase tracking-widest text-venus-400">Tambah Mapel</p>
            <div
              v-if="availableMapels.length === 0"
              class="rounded-xl border border-dashed border-venus-200 bg-venus-50 py-4 text-center text-sm text-venus-400"
            >
              Semua mata pelajaran sudah ditugaskan
            </div>
            <div v-else class="flex gap-2">
              <div class="flex-1">
                <AppSelect v-model="selectedMapelId" placeholder="Pilih mata pelajaran..." :options="availableMapels" />
              </div>
              <PrimaryButton :disabled="!selectedMapelId" :loading="saving" @click="handleAssign">
                <Plus :size="15" />
                Tambah
              </PrimaryButton>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end border-t border-venus-100 px-6 py-4">
          <button type="button" class="rounded-xl px-5 py-2.5 text-sm font-semibold text-venus-500 hover:bg-venus-50" @click="closeModal">
            Selesai
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
