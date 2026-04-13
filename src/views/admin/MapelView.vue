<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/services/supabase'
import { BookOpen, Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, EmptyState } from '@/components/ui'
import Swal from 'sweetalert2'

// ── State ──────────────────────────────────────────────────────────────────
const mapels = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showModal = ref(false)
const saving = ref(false)
const editingMapel = ref(null)

const form = ref({ nama: '' })
const errors = ref({})

// ── Fetch ──────────────────────────────────────────────────────────────────
const fetchMapel = async () => {
  loading.value = true
  let query = supabase.from('mapel').select('*').order('nama')
  if (searchQuery.value) query = query.ilike('nama', `%${searchQuery.value}%`)
  const { data, error } = await query
  if (error) Swal.fire('Error', error.message, 'error')
  else mapels.value = data || []
  loading.value = false
}

watch(searchQuery, fetchMapel)
onMounted(fetchMapel)

// ── Modal ──────────────────────────────────────────────────────────────────
const openAdd = () => {
  editingMapel.value = null
  form.value = { nama: '' }
  errors.value = {}
  showModal.value = true
}

const openEdit = (mapel) => {
  editingMapel.value = mapel
  form.value = { nama: mapel.nama || '' }
  errors.value = {}
  showModal.value = true
}

const validate = () => {
  const e = {}
  if (!form.value.nama.trim()) e.nama = 'Nama mata pelajaran wajib diisi'
  errors.value = e
  return Object.keys(e).length === 0
}

const handleSave = async () => {
  if (!validate()) return
  saving.value = true
  try {
    const payload = { nama: form.value.nama.trim() }
    if (editingMapel.value) {
      const { error } = await supabase.from('mapel').update(payload).eq('id', editingMapel.value.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('mapel').insert([payload])
      if (error) throw error
    }
    showModal.value = false
    fetchMapel()
    Swal.fire({ icon: 'success', title: editingMapel.value ? 'Diperbarui' : 'Ditambahkan', timer: 1200, showConfirmButton: false })
  } catch (err) {
    Swal.fire('Gagal', err.message, 'error')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (mapel) => {
  const result = await Swal.fire({
    title: `Hapus "${mapel.nama}"?`,
    text: 'Mata pelajaran ini akan dihapus permanen.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e31a1a',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
  })
  if (!result.isConfirmed) return
  const { error } = await supabase.from('mapel').delete().eq('id', mapel.id)
  if (error) Swal.fire('Gagal', error.message, 'error')
  else {
    Swal.fire({ icon: 'success', title: 'Dihapus', timer: 1200, showConfirmButton: false })
    fetchMapel()
  }
}

// Color per initial
const cardColor = (nama) => {
  const colors = [
    { bg: 'bg-primary-100', text: 'text-primary-700', badge: 'bg-primary-50 text-primary-600 ring-primary-100' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    { bg: 'bg-amber-100', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-600 ring-amber-100' },
    { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-600 ring-blue-100' },
    { bg: 'bg-purple-100', text: 'text-purple-700', badge: 'bg-purple-50 text-purple-600 ring-purple-100' },
    { bg: 'bg-rose-100', text: 'text-rose-700', badge: 'bg-rose-50 text-rose-600 ring-rose-100' },
  ]
  return colors[(nama?.charCodeAt(0) || 0) % colors.length]
}
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900">Mata Pelajaran</h1>
        <p class="mt-1 text-sm text-venus-400">Kelola daftar mata pelajaran yang tersedia di sistem.</p>
      </div>
      <PrimaryButton @click="openAdd">
        <Plus :size="16" />
        Tambah Mapel
      </PrimaryButton>
    </div>

    <div class="grid grid-cols-2 gap-4">
        <!-- Search -->
        <GlassCard padding="p-4">
          <FormInput class="mt-2" v-model="searchQuery" placeholder="Cari mata pelajaran..."></FormInput>
        </GlassCard>
    
        <!-- Stats -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GlassCard padding="p-5">
            <div class="flex items-center gap-4">
              <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <BookOpen :size="22" stroke-width="2" />
              </div>
              <div>
                <p class="text-[11px] font-black uppercase tracking-widest text-venus-400">Total Mapel</p>
                <p class="text-2xl font-black text-venus-900">{{ mapels.length }}</p>
              </div>
            </div>
          </GlassCard>
        </div>
    </div>


    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-32 animate-pulse rounded-2xl bg-venus-100" />
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="mapels.length === 0"
      title="Belum Ada Mata Pelajaran"
      description="Tambahkan mata pelajaran pertama untuk mulai mengelola soal dan ujian."
    >
      <template #action>
        <PrimaryButton @click="openAdd"><Plus :size="16" /> Tambah Sekarang</PrimaryButton>
      </template>
    </EmptyState>

    <!-- Grid Cards -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <GlassCard
        v-for="mapel in mapels"
        :key="mapel.id"
        padding="p-5"
        class="group relative"
        hover
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black"
              :class="[cardColor(mapel.nama).bg, cardColor(mapel.nama).text]"
            >
              {{ mapel.nama?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <h3 class="truncate font-bold text-venus-900">{{ mapel.nama }}</h3>
            </div>
          </div>

          <!-- Action buttons — visible on hover -->
          <div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              class="pressable-soft rounded-lg border border-venus-100 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:border-primary-200 hover:text-primary-600"
              title="Edit"
              @click="openEdit(mapel)"
            >
              <Pencil :size="14" />
            </button>
            <button
              type="button"
              class="pressable-soft rounded-lg border border-venus-100 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:border-red-200 hover:text-red-600"
              title="Hapus"
              @click="handleDelete(mapel)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <p v-if="mapel.created_at" class="mt-3 text-xs text-venus-400">
          Ditambahkan {{ new Date(mapel.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' }) }}
        </p>
      </GlassCard>
    </div>
  </div>

  <!-- Modal Tambah / Edit -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showModal"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @mousedown.self="showModal = false"
      >
        <div class="absolute inset-0 bg-venus-900/40 backdrop-blur-sm" />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div
            v-if="showModal"
            class="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-venus-100 bg-white shadow-venus"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-venus-100 px-6 py-5">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                  <BookOpen :size="18" stroke-width="2" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-venus-900">
                    {{ editingMapel ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran' }}
                  </h3>
                  <p class="text-xs text-venus-400">Lengkapi informasi mata pelajaran</p>
                </div>
              </div>
              <button
                type="button"
                class="pressable-soft rounded-lg p-1.5 text-venus-400 hover:bg-venus-100"
                @click="showModal = false"
              >
                <X :size="18" />
              </button>
            </div>

            <!-- Body -->
            <div class="space-y-4 px-6 py-6">
              <FormInput
                v-model="form.nama"
                label="Nama Mata Pelajaran"
                placeholder="Contoh: Matematika Wajib"
                :error="errors.nama"
              />
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 border-t border-venus-100 px-6 py-4">
              <button
                type="button"
                class="rounded-xl px-5 py-2.5 text-sm font-semibold text-venus-500 hover:bg-venus-50"
                @click="showModal = false"
              >
                Batal
              </button>
              <PrimaryButton :loading="saving" @click="handleSave">
                <Save :size="16" />
                {{ editingMapel ? 'Simpan' : 'Tambahkan' }}
              </PrimaryButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
