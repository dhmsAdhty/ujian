<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import {
  Plus, Clock, ChevronRight, Pencil, Trash2, Save,
  Shuffle, List, CheckSquare, Square, Search, X, Eye,
  Filter, GraduationCap, CalendarDays
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, AppSelect, EmptyState } from '@/components/ui'
import PreviewExamModal from '@/components/guru/PreviewExamModal.vue'
import Swal from 'sweetalert2'
import { toast } from 'gooey-toast'

const authStore = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const ujianList = ref([])
const showForm = ref(false)
const editingId = ref(null)
const formStep = ref(1) // 1 = setting, 2 = pilih soal

const isPreviewOpen = ref(false)
const previewUjianId = ref('')
const openPreview = (id) => {
  previewUjianId.value = id
  isPreviewOpen.value = true
}

const mapels = ref([])
const kelasList = ref([])

// Bank soal untuk step 2
const bankSoalList = ref([])
const loadingSoal = ref(false)
const soalSearch = ref('')
const soalFilterKelas = ref('')
const soalFilterTipe = ref('')
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
  soalFilterKelas.value = ''
  soalFilterTipe.value = ''
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
    .select('id, judul, konten, tipe_soal, kelas_id, kelas(nama), created_at')
    .eq('guru_id', authStore.user.id)
    .eq('mapel_id', form.value.mapel_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  bankSoalList.value = data || []
  loadingSoal.value = false
}

// Daftar kelas unik dari soal yang tersedia (untuk filter dropdown)
const availableKelas = computed(() => {
  const map = {}
  bankSoalList.value.forEach(s => {
    if (s.kelas_id && s.kelas?.nama) {
      map[s.kelas_id] = s.kelas.nama
    }
  })
  return Object.entries(map)
    .map(([id, nama]) => ({ value: id, label: nama }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const filteredSoal = computed(() => {
  let list = bankSoalList.value

  // Filter berdasarkan kelas
  if (soalFilterKelas.value) {
    list = list.filter(s => s.kelas_id === soalFilterKelas.value)
  }

  // Filter berdasarkan tipe soal
  if (soalFilterTipe.value) {
    list = list.filter(s => s.tipe_soal === soalFilterTipe.value)
  }

  // Filter berdasarkan kata kunci
  if (soalSearch.value) {
    const q = soalSearch.value.toLowerCase()
    list = list.filter(s =>
      (s.judul || s.konten || '').toLowerCase().includes(q)
    )
  }

  return list
})

const formatTanggalSoal = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

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
    return toast.warning({ title: 'Peringatan', description: 'Mohon lengkapi semua field wajib' })
  }
  // Fix #5: tanggal_selesai wajib diisi agar ujian punya batas waktu
  if (!form.value.tanggal_selesai) {
    return toast.warning({ title: 'Peringatan', description: 'Tanggal selesai wajib diisi agar ujian memiliki batas waktu' })
  }
  // Fix #4: tanggal_selesai harus setelah tanggal_mulai
  if (form.value.tanggal_selesai <= form.value.tanggal_mulai) {
    return toast.warning({ title: 'Peringatan', description: 'Tanggal selesai harus setelah tanggal mulai' })
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

const cancelForm = async () => {
  const hasData = form.value.nama || selectedSoalIds.value.length > 0
  if (hasData) {
    const { isConfirmed } = await Swal.fire({
      title: 'Batalkan perubahan?',
      text: 'Data yang sudah diisi akan hilang.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Batalkan',
      cancelButtonText: 'Lanjut Edit',
      confirmButtonColor: '#ef4444'
    })
    if (!isConfirmed) return
  }
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

  // Fix #6: Hitung jumlah soal per ujian
  const ujianData = ujianRes.data || []
  if (ujianData.length > 0) {
    const { data: soalCounts } = await supabase
      .from('ujian_soal')
      .select('ujian_id')
      .in('ujian_id', ujianData.map(u => u.id))
    const countMap = {}
    ;(soalCounts || []).forEach(r => {
      countMap[r.ujian_id] = (countMap[r.ujian_id] || 0) + 1
    })
    ujianList.value = ujianData.map(u => ({ ...u, jumlah_soal: countMap[u.id] || 0 }))
  } else {
    ujianList.value = []
  }

  loading.value = false
}

onMounted(fetchData)

const handleSave = async () => {
  if (selectedSoalIds.value.length === 0) {
    return toast.warning({ title: 'Peringatan', description: 'Pilih minimal 1 soal untuk ujian ini' })
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
    if (error) { toast.error({ title: 'Gagal', description: error.message }); saving.value = false; return }
  } else {
    const { data, error } = await supabase.from('ujian').insert([payload]).select('id').single()
    if (error) { toast.error({ title: 'Gagal', description: error.message }); saving.value = false; return }
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
  if (soalError) { toast.error({ title: 'Gagal menyimpan soal', description: soalError.message }); saving.value = false; return }

  toast.success({ title: 'Berhasil!' })
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
  if (error) toast.error({ title: 'Gagal', description: error.message })
  else fetchData()
}

// Hitung status efektif berdasarkan waktu nyata
const getEffectiveStatus = (ujian) => {
  const now = new Date()
  const mulai = ujian.tanggal_mulai ? new Date(ujian.tanggal_mulai) : null
  const selesai = ujian.tanggal_selesai ? new Date(ujian.tanggal_selesai) : null

  if (ujian.status === 'draft') return { label: 'Draft', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' }
  if (ujian.status === 'selesai') return { label: 'Selesai', badge: 'bg-venus-100 text-venus-500' }

  // Status aktif — cek apakah masih dalam rentang waktu
  if (ujian.status === 'aktif') {
    if (mulai && now < mulai) {
      return { label: 'Belum Mulai', badge: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' }
    }
    if (selesai && now > selesai) {
      return { label: 'Berakhir', badge: 'bg-red-50 text-red-500 ring-1 ring-red-100' }
    }
    return { label: 'Berlangsung', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' }
  }

  return { label: ujian.status, badge: 'bg-venus-100 text-venus-400' }
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
            <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Tanggal Selesai *</label>
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

        <!-- Search & Filters -->
        <div class="flex flex-col gap-3">
          <div class="relative">
            <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" />
            <input v-model="soalSearch" type="text" placeholder="Cari soal..." class="form-input pl-9 text-sm" />
          </div>
          <div class="flex items-center gap-2">
            <!-- Filter Kelas -->
            <div class="flex-1">
              <AppSelect
                v-model="soalFilterKelas"
                placeholder="Semua Kelas"
                :options="availableKelas"
              />
            </div>
            <!-- Filter Tipe -->
            <div class="flex-1">
              <AppSelect
                v-model="soalFilterTipe"
                placeholder="Semua Tipe"
                :options="[
                  { value: 'pilihan_ganda', label: 'Pilihan Ganda' },
                  { value: 'pilihan_ganda_kompleks', label: 'PG Kompleks' },
                  { value: 'essay', label: 'Essay' },
                ]"
              />
            </div>
          </div>
        </div>

        <!-- Active filter summary -->
        <div v-if="soalFilterKelas || soalFilterTipe || soalSearch" class="flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-semibold text-venus-400">Filter aktif:</span>
          <span
            v-if="soalFilterKelas"
            class="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600 ring-1 ring-sky-100"
          >
            <GraduationCap :size="10" />
            {{ availableKelas.find(k => k.value === soalFilterKelas)?.label }}
            <button type="button" @click.stop="soalFilterKelas = ''" class="ml-0.5 hover:text-sky-800">
              <X :size="10" />
            </button>
          </span>
          <span
            v-if="soalFilterTipe"
            class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold ring-1" :class="tipeBadge(soalFilterTipe).cls"
          >
            {{ tipeBadge(soalFilterTipe).label }}
            <button type="button" @click.stop="soalFilterTipe = ''" class="ml-0.5 hover:opacity-70">
              <X :size="10" />
            </button>
          </span>
          <span
            v-if="soalSearch"
            class="inline-flex items-center gap-1 rounded-lg bg-venus-100 px-2 py-0.5 text-[10px] font-bold text-venus-600"
          >
            "{{ soalSearch }}"
            <button type="button" @click.stop="soalSearch = ''" class="ml-0.5 hover:text-venus-800">
              <X :size="10" />
            </button>
          </span>
          <button
            type="button"
            @click.stop="soalSearch = ''; soalFilterKelas = ''; soalFilterTipe = ''"
            class="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors"
          >
            Reset Semua
          </button>
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
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <!-- Tipe soal -->
                  <span class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" :class="tipeBadge(soal.tipe_soal).cls">
                    {{ tipeBadge(soal.tipe_soal).label }}
                  </span>
                  <!-- Kelas badge -->
                  <span
                    v-if="soal.kelas?.nama"
                    class="inline-flex items-center gap-0.5 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 ring-1 ring-sky-100"
                  >
                    <GraduationCap :size="9" />
                    {{ soal.kelas.nama }}
                  </span>
                  <!-- Tanggal dibuat -->
                  <span
                    v-if="soal.created_at"
                    class="inline-flex items-center gap-0.5 rounded bg-venus-50 px-1.5 py-0.5 text-[10px] font-medium text-venus-400"
                  >
                    <CalendarDays :size="9" />
                    {{ formatTanggalSoal(soal.created_at) }}
                  </span>
                  <!-- Mode urutan (saat dipilih) -->
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

    <!-- Table / Card (hanya tampil saat form tidak aktif) -->
    <GlassCard v-if="!showForm" padding="p-0" class="overflow-hidden">
      <div v-if="loading" class="divide-y divide-venus-50">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-4 py-4 sm:px-6">
          <div class="h-4 w-32 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 flex-1 animate-pulse rounded-full bg-venus-100" />
          <div class="hidden h-4 w-24 animate-pulse rounded-full bg-venus-100 sm:block" />
          <div class="hidden h-4 w-20 animate-pulse rounded-full bg-venus-100 sm:block" />
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

      <template v-else>
        <!-- ===================== MOBILE CARD LIST (< md) ===================== -->
        <div class="divide-y divide-venus-50 md:hidden">
          <div
            v-for="(ujian, index) in ujianList"
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
                  <span class="inline-flex items-center gap-1 rounded-lg bg-venus-100 px-2 py-0.5 text-[10px] font-bold text-venus-600">
                    {{ ujian.jumlah_soal ?? '—' }} soal
                  </span>
                </div>
                <p class="font-semibold text-venus-800 text-sm leading-snug">{{ ujian.nama }}</p>
                <p class="text-xs text-venus-400 mt-0.5">
                  {{ ujian.mapel?.nama || '—' }} · {{ ujian.kelas?.nama || '—' }}
                </p>
                <div class="flex items-center gap-1 text-xs text-venus-400 mt-1">
                  <Clock :size="11" />
                  {{ ujian.durasi }} mnt · {{ formatDate(ujian.tanggal_mulai) }}
                </div>
              </div>
              <!-- Aksi -->
              <div class="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  :id="index === 0 ? 'tour-btn-preview-jadwal' : ''"
                  @click="openPreview(ujian.id)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-2 text-venus-400 shadow-ios-sm hover:text-amber-500 active:opacity-70"
                  title="Preview POV Siswa"
                  aria-label="Preview POV Siswa"
                >
                  <Eye :size="15" />
                </button>
                <button
                  type="button"
                  @click="openForm(ujian)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-2 text-venus-400 shadow-ios-sm hover:text-primary-600 active:opacity-70"
                  aria-label="Edit ujian"
                >
                  <Pencil :size="15" />
                </button>
                <button
                  type="button"
                  @click="handleDelete(ujian)"
                  class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-2 text-venus-400 shadow-ios-sm hover:text-red-500 active:opacity-70"
                  aria-label="Hapus ujian"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ===================== DESKTOP TABLE (md+) ===================== -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-sm table-fixed">
            <colgroup>
              <col style="width: 26%" />
              <col style="width: 11%" />
              <col style="width: 9%" />
              <col style="width: 7%" />
              <col style="width: 10%" />
              <col style="width: 16%" />
              <col style="width: 10%" />
              <col style="width: 11%" />
            </colgroup>
            <thead>
              <tr class="border-b border-venus-100 bg-venus-50/60">
                <th class="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-venus-400">Nama Ujian</th>
                <th class="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-venus-400">Mapel</th>
                <th class="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-venus-400">Kelas</th>
                <th class="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-venus-400 text-center">Soal</th>
                <th class="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-venus-400">Durasi</th>
                <th class="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-venus-400">Mulai</th>
                <th class="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-venus-400 text-center">Status</th>
                <th class="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-venus-400">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-venus-50">
              <tr v-for="(ujian, index) in ujianList" :key="ujian.id" class="transition-colors hover:bg-venus-50/50">
                <td class="px-4 py-3.5">
                  <p class="truncate font-medium text-venus-800" :title="ujian.nama">{{ ujian.nama }}</p>
                </td>
                <td class="px-3 py-3.5 text-venus-600 truncate">{{ ujian.mapel?.nama || '—' }}</td>
                <td class="px-3 py-3.5 text-venus-600 whitespace-nowrap">{{ ujian.kelas?.nama || '—' }}</td>
                <td class="px-3 py-3.5 text-center">
                  <span class="inline-flex items-center justify-center min-w-[28px] rounded-lg bg-venus-100 px-2 py-0.5 text-xs font-bold text-venus-600">
                    {{ ujian.jumlah_soal ?? '—' }}
                  </span>
                </td>
                <td class="px-3 py-3.5 whitespace-nowrap">
                  <div class="flex items-center gap-1.5 text-venus-600">
                    <Clock :size="13" class="shrink-0" />
                    <span>{{ ujian.durasi }} mnt</span>
                  </div>
                </td>
                <td class="px-3 py-3.5 text-venus-500 text-xs whitespace-nowrap">{{ formatDate(ujian.tanggal_mulai) }}</td>
                <td class="px-3 py-3.5 text-center">
                  <span
                    class="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
                    :class="getEffectiveStatus(ujian).badge"
                  >
                    {{ getEffectiveStatus(ujian).label }}
                  </span>
                </td>
                <td class="px-3 py-3.5">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      :id="index === 0 ? 'tour-btn-preview-jadwal' : ''"
                      @click="openPreview(ujian.id)"
                      class="pressable-soft rounded-lg border border-venus-200/80 bg-white p-1.5 text-venus-400 shadow-ios-sm hover:text-amber-500 active:opacity-70"
                      title="Preview POV Siswa"
                      aria-label="Preview POV Siswa"
                    >
                      <Eye :size="15" />
                    </button>
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
