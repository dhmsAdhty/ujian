<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import {
  Plus, Clock, ChevronRight, Pencil, Trash2, Save,
  Shuffle, List, CheckSquare, Square, Search, X
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, AppSelect, EmptyState } from '@/components/ui'
import Swal from 'sweetalert2'

const authStore = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const ujianList = ref([])
const showForm = ref(false)
const editingId = ref(null)
const formStep = ref(1) // 1 = setting, 2 = pilih soal

const mapels = ref([])
const kelasList = ref([])

// Bank soal untuk step 2
const bankSoalList = ref([])
const loadingSoal = ref(false)
const soalSearch = ref('')
const selectedSoalIds = ref([])

const form = ref({
  nama: '',
  mapel_id: '',
  kelas_id: '',
  durasi: 90,
  tanggal_mulai: '',
  tanggal_selesai: '',
  status: 'draft',
  acak_soal: false
})

const resetForm = () => {
  form.value = { nama: '', mapel_id: '', kelas_id: '', durasi: 90, tanggal_mulai: '', tanggal_selesai: '', status: 'draft', acak_soal: false }
  editingId.value = null
  formStep.value = 1
  selectedSoalIds.value = []
  soalSearch.value = ''
  bankSoalList.value = []
}

const toWIBLocal = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 16)
}

const fromWIBLocal = (localStr) => {
  if (!localStr) return null
  const d = new Date(localStr + ':00Z')
  const utc = new Date(d.getTime() - 7 * 60 * 60 * 1000)
  return utc.toISOString()
}

const previewWIB = (localStr) => {
  if (!localStr) return null
  const [datePart, timePart] = localStr.split('T')
  const [hour, minute] = timePart.split(':')
  const date = new Date(datePart)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + hour + ':' + minute + ' WIB'
}

const formatDate = (d) => d
  ? new Date(d).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false
    }) + ' WIB'
  : '—'

// Fetch soal berdasarkan mapel yang dipilih
const fetchBankSoal = async () => {
  if (!form.value.mapel_id) return
  loadingSoal.value = true
  const { data } = await supabase
    .from('bank_soal')
    .select('id, judul, konten, tipe_soal')
    .eq('guru_id', authStore.user.id)
    .eq('mapel_id', form.value.mapel_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  bankSoalList.value = data || []
  loadingSoal.value = false
}

const filteredSoal = computed(() => {
  if (!soalSearch.value) return bankSoalList.value
  const q = soalSearch.value.toLowerCase()
  return bankSoalList.value.filter(s =>
    (s.judul || s.konten || '').toLowerCase().includes(q)
  )
})

const toggleSoal = (id) => {
  const idx = selectedSoalIds.value.indexOf(id)
  if (idx === -1) selectedSoalIds.value.push(id)
  else selectedSoalIds.value.splice(idx, 1)
}

const toggleAllSoal = () => {
  if (selectedSoalIds.value.length === filteredSoal.value.length) {
    selectedSoalIds.value = []
  } else {
    selectedSoalIds.value = filteredSoal.value.map(s => s.id)
  }
}

// Hitung nomor urut soal berdasarkan posisi di daftar (bukan urutan diklik)
// Hanya berlaku untuk mode Urut; mode Acak cukup tampilkan '?'
const getUrutanNumber = (soalId) => {
  let count = 0
  for (const s of bankSoalList.value) {
    if (selectedSoalIds.value.includes(s.id)) {
      count++
      if (s.id === soalId) return count
    }
  }
  return null
}

const tipeBadge = (tipe) => {
  if (tipe === 'pilihan_ganda') return { label: 'PG', cls: 'bg-orange-50 text-orange-600 ring-1 ring-orange-100' }
  if (tipe === 'pilihan_ganda_kompleks') return { label: 'PG Kompleks', cls: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100' }
  return { label: 'Essay', cls: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' }
}

const goToStep2 = async () => {
  if (!form.value.nama || !form.value.mapel_id || !form.value.kelas_id || !form.value.tanggal_mulai) {
    return Swal.fire('Peringatan', 'Mohon lengkapi semua field wajib', 'warning')
  }
  await fetchBankSoal()
  formStep.value = 2
}

const openForm = async (ujian = null) => {
  resetForm()
  if (ujian) {
    editingId.value = ujian.id
    form.value = {
      nama: ujian.nama,
      mapel_id: ujian.mapel_id,
      kelas_id: ujian.kelas_id,
      durasi: ujian.durasi,
      tanggal_mulai: toWIBLocal(ujian.tanggal_mulai),
      tanggal_selesai: toWIBLocal(ujian.tanggal_selesai),
      status: ujian.status,
      acak_soal: ujian.acak_soal ?? false
    }
    const { data: existingSoal } = await supabase
      .from('ujian_soal').select('soal_id').eq('ujian_id', ujian.id)
    selectedSoalIds.value = (existingSoal || []).map(r => r.soal_id)
  }
  showForm.value = true
}

const cancelForm = () => {
  showForm.value = false
  resetForm()
}

const fetchData = async () => {
  loading.value = true
  const guruId = authStore.user.id
  const { data: penugasan } = await supabase
    .from('guru_mapel').select('mapel_id').eq('guru_id', guruId)
  const mapelIds = (penugasan || []).map(r => r.mapel_id)

  const [mapelRes, kelasRes, ujianRes] = await Promise.all([
    mapelIds.length > 0
      ? supabase.from('mapel').select('id, nama').in('id', mapelIds).order('nama')
      : Promise.resolve({ data: [] }),
    supabase.from('kelas').select('id, nama').order('nama'),
    supabase.from('ujian')
      .select('*, mapel(nama), kelas(nama)')
      .eq('guru_id', guruId)
      .order('tanggal_mulai', { ascending: false })
  ])

  mapels.value = mapelRes.data || []
  kelasList.value = kelasRes.data || []
  ujianList.value = ujianRes.data || []
  loading.value = false
}

onMounted(fetchData)

const handleSave = async () => {
  if (selectedSoalIds.value.length === 0) {
    return Swal.fire('Peringatan', 'Pilih minimal 1 soal untuk ujian ini', 'warning')
  }
  saving.value = true
  const payload = {
    ...form.value,
    tanggal_mulai: fromWIBLocal(form.value.tanggal_mulai),
    tanggal_selesai: fromWIBLocal(form.value.tanggal_selesai),
    guru_id: authStore.user.id
  }

  let ujianId = editingId.value
  if (editingId.value) {
    const { error } = await supabase.from('ujian').update(payload).eq('id', editingId.value)
    if (error) { Swal.fire('Gagal', error.message, 'error'); saving.value = false; return }
  } else {
    const { data, error } = await supabase.from('ujian').insert([payload]).select('id').single()
    if (error) { Swal.fire('Gagal', error.message, 'error'); saving.value = false; return }
    ujianId = data.id
  }

  await supabase.from('ujian_soal').delete().eq('ujian_id', ujianId)
  // Urut: simpan sesuai urutan posisi di daftar bank soal
  // Acak: urutan tidak relevan (engine akan mengacak), tetap simpan sebagai referensi
  const orderedIds = form.value.acak_soal
    ? selectedSoalIds.value
    : bankSoalList.value.filter(s => selectedSoalIds.value.includes(s.id)).map(s => s.id)
  const rows = orderedIds.map((soal_id, idx) => ({ ujian_id: ujianId, soal_id, urutan: idx + 1 }))
  const { error: soalError } = await supabase.from('ujian_soal').insert(rows)
  if (soalError) { Swal.fire('Gagal menyimpan soal', soalError.message, 'error'); saving.value = false; return }

  Swal.fire({ icon: 'success', title: 'Berhasil!', timer: 1200, showConfirmButton: false })
  showForm.value = false
  resetForm()
  fetchData()
  saving.value = false
}

const handleDelete = async (ujian) => {
  const result = await Swal.fire({
    title: `Hapus "${ujian.nama}"?`,
    text: 'Ujian ini akan dihapus permanen.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e31a1a',
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal'
  })
  if (!result.isConfirmed) return
  const { error } = await supabase.from('ujian').delete().eq('id', ujian.id)
  if (error) Swal.fire('Gagal', error.message, 'error')
  else fetchData()
}

const statusBadge = (status) => {
  if (status === 'aktif') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
  if (status === 'selesai') return 'bg-venus-100 text-venus-500'
  return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
}

const statusLabel = (status) => {
  if (status === 'aktif') return 'Aktif'
  if (status === 'selesai') return 'Selesai'
  return 'Draft'
}
</script>

<template>
  <div class="animate-fade-in space-y-6">

    <!-- Breadcrumb / Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <!-- Breadcrumb saat form aktif -->
        <div v-if="showForm" class="mb-1 flex items-center gap-1.5 text-sm text-venus-400">
          <button type="button" class="font-medium hover:text-primary-600 transition-colors" @click="cancelForm">
            Jadwal Ujian
          </button>
          <ChevronRight :size="14" />
          <span class="font-medium text-venus-700">{{ editingId ? 'Edit Ujian' : 'Buat Ujian Baru' }}</span>
          <ChevronRight v-if="formStep === 2" :size="14" />
          <span v-if="formStep === 2" class="font-medium text-venus-700">Pilih Soal</span>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-venus-900">
          {{ showForm ? (editingId ? 'Edit Ujian' : 'Buat Ujian Baru') : 'Jadwal Ujian' }}
        </h1>
        <p class="mt-1 text-sm text-venus-500">
          {{ showForm
            ? (formStep === 1 ? 'Isi pengaturan dasar ujian.' : 'Pilih soal dan atur urutan tampil.')
            : 'Buat dan kelola jadwal ujian untuk kelas Anda.' }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="showForm"
          type="button"
          class="flex items-center gap-1.5 rounded-xl border border-venus-200 bg-white px-4 py-2.5 text-sm font-semibold text-venus-500 shadow-ios-sm hover:bg-venus-50 transition-colors"
          @click="cancelForm"
        >
          <X :size="15" /> Batal
        </button>
        <PrimaryButton v-else @click="openForm()">
          <Plus :size="16" />
          Buat Ujian
        </PrimaryButton>
      </div>
    </div>

    <!-- Form Inline -->
    <template v-if="showForm">

      <!-- Step indicator breadcrumb bar -->
      <div class="flex items-center gap-2 text-sm">
        <button
          type="button"
          class="flex items-center gap-2 font-semibold transition-colors"
          :class="formStep === 1 ? 'text-primary-600' : 'text-venus-400 hover:text-venus-600'"
          @click="formStep = 1"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-black"
            :class="formStep === 1 ? 'bg-primary-500 text-white' : 'bg-venus-100 text-venus-500'"
          >1</span>
          Pengaturan Ujian
        </button>
        <ChevronRight :size="14" class="text-venus-300" />
        <span
          class="flex items-center gap-2 font-semibold"
          :class="formStep === 2 ? 'text-primary-600' : 'text-venus-300'"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-black"
            :class="formStep === 2 ? 'bg-primary-500 text-white' : 'bg-venus-100 text-venus-300'"
          >2</span>
          Pilih Soal
        </span>
      </div>

      <!-- Step 1: Pengaturan -->
      <GlassCard v-if="formStep === 1" class="space-y-5">
        <FormInput v-model="form.nama" label="Nama Ujian *" placeholder="Contoh: UTS Matematika Ganjil 2026" />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Mata Pelajaran *</label>
            <AppSelect v-model="form.mapel_id" placeholder="Pilih Mapel" :options="mapels.map(m => ({ value: m.id, label: m.nama }))" />
          </div>
          <div class="space-y-1.5">
            <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Kelas *</label>
            <AppSelect v-model="form.kelas_id" placeholder="Pilih Kelas" :options="kelasList.map(k => ({ value: k.id, label: k.nama }))" />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Tanggal Mulai *</label>
            <input v-model="form.tanggal_mulai" type="datetime-local" class="form-input text-sm" />
            <p v-if="form.tanggal_mulai" class="ml-1 text-[10px] font-semibold text-primary-600">{{ previewWIB(form.tanggal_mulai) }}</p>
            <p v-else class="ml-1 text-[10px] text-venus-400">Waktu dalam zona WIB (UTC+7)</p>
          </div>
          <div class="space-y-1.5">
            <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Tanggal Selesai</label>
            <input v-model="form.tanggal_selesai" type="datetime-local" class="form-input text-sm" />
            <p v-if="form.tanggal_selesai" class="ml-1 text-[10px] font-semibold text-primary-600">{{ previewWIB(form.tanggal_selesai) }}</p>
            <p v-else class="ml-1 text-[10px] text-venus-400">Waktu dalam zona WIB (UTC+7)</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Durasi (menit) *</label>
            <input v-model.number="form.durasi" type="number" min="10" max="300" class="form-input text-sm font-bold" />
          </div>
          <div class="space-y-1.5">
            <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Status</label>
            <AppSelect v-model="form.status" :options="[
              { value: 'draft', label: 'Draft' },
              { value: 'aktif', label: 'Aktif' },
              { value: 'selesai', label: 'Selesai' },
            ]" />
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <PrimaryButton @click="goToStep2">
            Pilih Soal <ChevronRight :size="15" />
          </PrimaryButton>
        </div>
      </GlassCard>

      <!-- Step 2: Pilih Soal -->
      <GlassCard v-else class="space-y-4">
        <!-- Toggle urutan -->
        <div class="flex items-center justify-between rounded-xl border border-venus-100 bg-venus-50/60 px-4 py-3">
          <div class="flex items-center gap-2 text-sm font-semibold text-venus-700">
            <component :is="form.acak_soal ? Shuffle : List" :size="16" />
            Urutan Soal
          </div>
          <div class="flex items-center gap-3">
            <!-- Badge mode aktif -->
            <span
              class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider"
              :class="form.acak_soal
                ? 'bg-purple-50 text-purple-600 ring-1 ring-purple-100'
                : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'"
            >
              <component :is="form.acak_soal ? Shuffle : List" :size="11" />
              {{ form.acak_soal ? 'Acak' : 'Urut' }}
            </span>
            <div class="flex items-center gap-1 rounded-lg border border-venus-200 bg-white p-0.5">
              <button
                type="button"
                @click="form.acak_soal = false"
                class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                :class="!form.acak_soal ? 'bg-primary-500 text-white shadow-sm' : 'text-venus-500 hover:bg-venus-50'"
              >
                <List :size="13" /> Urut
              </button>
              <button
                type="button"
                @click="form.acak_soal = true"
                class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                :class="form.acak_soal ? 'bg-primary-500 text-white shadow-sm' : 'text-venus-500 hover:bg-venus-50'"
              >
                <Shuffle :size="13" /> Acak
              </button>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div class="relative">
          <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" />
          <input v-model="soalSearch" type="text" placeholder="Cari soal..." class="form-input pl-9 text-sm" />
        </div>

        <!-- List soal -->
        <div class="overflow-hidden rounded-xl border border-venus-100 divide-y divide-venus-50">
          <div v-if="loadingSoal" class="flex items-center justify-center py-10 text-sm text-venus-400">
            Memuat soal...
          </div>
          <div v-else-if="filteredSoal.length === 0" class="flex items-center justify-center py-10 text-sm text-venus-400">
            Tidak ada soal untuk mapel ini
          </div>
          <template v-else>
            <button
              type="button"
              @click="toggleAllSoal"
              class="flex w-full items-center gap-3 bg-venus-50/60 px-4 py-2.5 text-xs font-bold text-venus-500 hover:bg-venus-100 transition-colors"
            >
              <component
                :is="selectedSoalIds.length === filteredSoal.length ? CheckSquare : Square"
                :size="15"
                :class="selectedSoalIds.length === filteredSoal.length ? 'text-primary-500' : 'text-venus-300'"
              />
              Pilih Semua ({{ filteredSoal.length }} soal)
            </button>
            <button
              v-for="soal in filteredSoal"
              :key="soal.id"
              type="button"
              @click="toggleSoal(soal.id)"
              class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-venus-50/70"
              :class="selectedSoalIds.includes(soal.id) ? 'bg-primary-50/40' : ''"
            >
              <component
                :is="selectedSoalIds.includes(soal.id) ? CheckSquare : Square"
                :size="16"
                class="mt-0.5 shrink-0 transition-colors"
                :class="selectedSoalIds.includes(soal.id) ? 'text-primary-500' : 'text-venus-300'"
              />
              <!-- Nomor urut / indikator acak (hanya tampil saat dipilih) -->
              <div
                v-if="selectedSoalIds.includes(soal.id)"
                class="mt-0.5 shrink-0 flex items-center gap-1"
              >
                <!-- Urut: tampilkan nomor otomatis berdasarkan posisi di daftar -->
                <span
                  v-if="!form.acak_soal"
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700"
                >
                  {{ getUrutanNumber(soal.id) }}
                </span>
                <!-- Acak: tampilkan '?' karena urutan tidak tetap -->
                <span
                  v-else
                  class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[11px] font-black text-purple-600"
                  title="Urutan diacak saat ujian"
                >
                  ?
                </span>
              </div>
              <div v-else class="mt-0.5 h-5 w-5 shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-venus-800">{{ soal.judul || soal.konten }}</p>
                <div class="mt-0.5 flex items-center gap-2">
                  <span class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" :class="tipeBadge(soal.tipe_soal).cls">
                    {{ tipeBadge(soal.tipe_soal).label }}
                  </span>
                  <span
                    v-if="selectedSoalIds.includes(soal.id)"
                    class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide"
                    :class="form.acak_soal
                      ? 'bg-purple-50 text-purple-500'
                      : 'bg-emerald-50 text-emerald-600'"
                  >
                    <component :is="form.acak_soal ? Shuffle : List" :size="9" />
                    {{ form.acak_soal ? 'Acak' : 'Urut' }}
                  </span>
                </div>
              </div>
            </button>
          </template>
        </div>

        <div class="flex items-center justify-between pt-1">
          <p class="text-xs text-venus-400">{{ selectedSoalIds.length }} soal dipilih</p>
          <PrimaryButton @click="handleSave" :loading="saving">
            <Save :size="15" />
            {{ editingId ? 'Simpan Perubahan' : 'Buat Ujian' }}
          </PrimaryButton>
        </div>
      </GlassCard>
    </template>

    <!-- Table (hanya tampil saat form tidak aktif) -->
    <GlassCard v-if="!showForm" padding="p-0" class="overflow-hidden">
      <div v-if="loading" class="divide-y divide-venus-50">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-6 py-4">
          <div class="h-4 w-32 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 flex-1 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 w-24 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 w-20 animate-pulse rounded-full bg-venus-100" />
        </div>
      </div>

      <EmptyState
        v-else-if="ujianList.length === 0"
        title="Belum ada ujian"
        description="Buat jadwal ujian pertama untuk kelas Anda."
      >
        <template #action>
          <PrimaryButton @click="openForm()">Buat Ujian</PrimaryButton>
        </template>
      </EmptyState>

      <table v-else class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-venus-100 bg-venus-50/60">
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Nama Ujian</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Mapel</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Kelas</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Durasi</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Mulai</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Status</th>
            <th class="px-6 py-3.5 text-right font-bold uppercase tracking-wider text-venus-400 text-xs px-6 py-3.5">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-venus-50">
          <tr v-for="ujian in ujianList" :key="ujian.id" class="transition-colors hover:bg-venus-50/50">
            <td class="max-w-[200px] px-6 py-4">
              <p class="truncate font-medium text-venus-800">{{ ujian.nama }}</p>
            </td>
            <td class="px-6 py-4 text-venus-600">{{ ujian.mapel?.nama || '—' }}</td>
            <td class="px-6 py-4 text-venus-600">{{ ujian.kelas?.nama || '—' }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-1 text-venus-600">
                <Clock :size="13" />
                {{ ujian.durasi }} menit
              </div>
            </td>
            <td class="px-6 py-4 text-venus-500 text-xs">{{ formatDate(ujian.tanggal_mulai) }}</td>
            <td class="px-6 py-4">
              <span class="inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" :class="statusBadge(ujian.status)">
                {{ statusLabel(ujian.status) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  @click="openForm(ujian)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:text-primary-600 active:opacity-70"
                  aria-label="Edit ujian"
                >
                  <Pencil :size="15" />
                </button>
                <button
                  type="button"
                  @click="handleDelete(ujian)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:text-red-500 active:opacity-70"
                  aria-label="Hapus ujian"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </GlassCard>

  </div>
</template>
