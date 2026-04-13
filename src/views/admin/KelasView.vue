<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/services/supabase'
import { School, Plus, Pencil, Trash2, X, Save, Users } from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, EmptyState } from '@/components/ui'
import Swal from 'sweetalert2'

const kelas = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showModal = ref(false)
const saving = ref(false)
const editingKelas = ref(null)
const siswaCount = ref({}) // { kelas_id: count }

const form = ref({ nama: '' })
const errors = ref({})

const fetchKelas = async () => {
  loading.value = true
  let query = supabase.from('kelas').select('*').order('nama')
  if (searchQuery.value) query = query.ilike('nama', `%${searchQuery.value}%`)
  const { data, error } = await query
  if (error) Swal.fire('Error', error.message, 'error')
  else {
    kelas.value = data || []
    // Fetch jumlah siswa per kelas
    const { data: profiles } = await supabase
      .from('profiles')
      .select('kelas_id')
      .eq('role', 'siswa')
      .not('kelas_id', 'is', null)
    const counts = {}
    ;(profiles || []).forEach(p => {
      counts[p.kelas_id] = (counts[p.kelas_id] || 0) + 1
    })
    siswaCount.value = counts
  }
  loading.value = false
}

watch(searchQuery, fetchKelas)
onMounted(fetchKelas)

const openAdd = () => {
  editingKelas.value = null
  form.value = { nama: '' }
  errors.value = {}
  showModal.value = true
}

const openEdit = (k) => {
  editingKelas.value = k
  form.value = { nama: k.nama || '' }
  errors.value = {}
  showModal.value = true
}

const validate = () => {
  const e = {}
  if (!form.value.nama.trim()) e.nama = 'Nama kelas wajib diisi'
  errors.value = e
  return Object.keys(e).length === 0
}

const handleSave = async () => {
  if (!validate()) return
  saving.value = true
  try {
    const payload = { nama: form.value.nama.trim() }
    if (editingKelas.value) {
      const { error } = await supabase.from('kelas').update(payload).eq('id', editingKelas.value.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('kelas').insert([payload])
      if (error) throw error
    }
    showModal.value = false
    fetchKelas()
    Swal.fire({ icon: 'success', title: editingKelas.value ? 'Diperbarui' : 'Ditambahkan', timer: 1200, showConfirmButton: false })
  } catch (err) {
    Swal.fire('Gagal', err.message, 'error')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (k) => {
  const count = siswaCount.value[k.id] || 0
  const result = await Swal.fire({
    title: `Hapus kelas "${k.nama}"?`,
    html: count > 0
      ? `<span class="text-red-600 font-semibold">${count} siswa</span> masih terdaftar di kelas ini.`
      : 'Kelas ini akan dihapus permanen.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e31a1a',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
  })
  if (!result.isConfirmed) return
  const { error } = await supabase.from('kelas').delete().eq('id', k.id)
  if (error) Swal.fire('Gagal', error.message, 'error')
  else {
    Swal.fire({ icon: 'success', title: 'Dihapus', timer: 1200, showConfirmButton: false })
    fetchKelas()
  }
}

const cardColor = (nama) => {
  const colors = [
    { bg: 'bg-primary-100', text: 'text-primary-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
  ]
  return colors[(nama?.charCodeAt(0) || 0) % colors.length]
}
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900">Kelola Kelas</h1>
        <p class="mt-1 text-sm text-venus-400">Kelola daftar kelas dan lihat jumlah siswa per kelas.</p>
      </div>
      <PrimaryButton @click="openAdd">
        <Plus :size="16" />
        Tambah Kelas
      </PrimaryButton>
    </div>

    <!-- Search + Stats -->
    <div class="grid grid-cols-2 gap-4">
      <GlassCard padding="p-4">
        <FormInput class="mt-2" v-model="searchQuery" placeholder="Cari kelas..." />
      </GlassCard>
      <GlassCard padding="p-5">
        <div class="flex items-center gap-4">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <School :size="22" stroke-width="2" />
          </div>
          <div>
            <p class="text-[11px] font-black uppercase tracking-widest text-venus-400">Total Kelas</p>
            <p class="text-2xl font-black text-venus-900">{{ kelas.length }}</p>
          </div>
        </div>
      </GlassCard>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-32 animate-pulse rounded-2xl bg-venus-100" />
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="kelas.length === 0"
      title="Belum Ada Kelas"
      description="Tambahkan kelas pertama untuk mulai mendaftarkan siswa."
    >
      <template #action>
        <PrimaryButton @click="openAdd"><Plus :size="16" /> Tambah Sekarang</PrimaryButton>
      </template>
    </EmptyState>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <GlassCard
        v-for="k in kelas"
        :key="k.id"
        padding="p-5"
        class="group relative"
        hover
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black"
              :class="[cardColor(k.nama).bg, cardColor(k.nama).text]"
            >
              {{ k.nama?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <h3 class="truncate font-bold text-venus-900">{{ k.nama }}</h3>
              <div class="mt-1 flex items-center gap-1 text-xs text-venus-400">
                <Users :size="11" />
                {{ siswaCount[k.id] || 0 }} siswa
              </div>
            </div>
          </div>

          <div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              class="pressable-soft rounded-lg border border-venus-100 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:border-primary-200 hover:text-primary-600"
              @click="openEdit(k)"
            >
              <Pencil :size="14" />
            </button>
            <button
              type="button"
              class="pressable-soft rounded-lg border border-venus-100 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:border-red-200 hover:text-red-600"
              @click="handleDelete(k)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <p v-if="k.created_at" class="mt-3 text-xs text-venus-400">
          Ditambahkan {{ new Date(k.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' }) }}
        </p>
      </GlassCard>
    </div>
  </div>

  <!-- Modal -->
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @mousedown.self="showModal = false">
        <div class="absolute inset-0 bg-venus-900/40 backdrop-blur-sm" />
        <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95 translate-y-2" enter-to-class="opacity-100 scale-100 translate-y-0">
          <div v-if="showModal" class="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-venus-100 bg-white shadow-venus">
            <div class="flex items-center justify-between border-b border-venus-100 px-6 py-5">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <School :size="18" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-venus-900">{{ editingKelas ? 'Edit Kelas' : 'Tambah Kelas' }}</h3>
                  <p class="text-xs text-venus-400">Lengkapi informasi kelas</p>
                </div>
              </div>
              <button type="button" class="pressable-soft rounded-lg p-1.5 text-venus-400 hover:bg-venus-100" @click="showModal = false">
                <X :size="18" />
              </button>
            </div>
            <div class="space-y-4 px-6 py-6">
              <FormInput v-model="form.nama" label="Nama Kelas" placeholder="Contoh: XII MIPA 1" :error="errors.nama" />
            </div>
            <div class="flex items-center justify-end gap-3 border-t border-venus-100 px-6 py-4">
              <button type="button" class="rounded-xl px-5 py-2.5 text-sm font-semibold text-venus-500 hover:bg-venus-50" @click="showModal = false">Batal</button>
              <PrimaryButton :loading="saving" @click="handleSave">
                <Save :size="16" />
                {{ editingKelas ? 'Simpan' : 'Tambahkan' }}
              </PrimaryButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
