<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import {
  Plus, CalendarDays, Clock, BookOpen, Users,
  ChevronLeft, ChevronRight, Pencil, Trash2, X, Save
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, AppSelect, EmptyState } from '@/components/ui'
import Swal from 'sweetalert2'

const authStore = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const ujianList = ref([])
const showModal = ref(false)
const editingId = ref(null)

const mapels = ref([])
const kelasList = ref([])

const form = ref({
  nama: '',
  mapel_id: '',
  kelas_id: '',
  durasi: 90,
  tanggal_mulai: '',
  tanggal_selesai: '',
  status: 'draft'
})

const resetForm = () => {
  form.value = { nama: '', mapel_id: '', kelas_id: '', durasi: 90, tanggal_mulai: '', tanggal_selesai: '', status: 'draft' }
  editingId.value = null
}

// WIB = UTC+7
// Konversi UTC ISO string → "YYYY-MM-DDTHH:mm" dalam WIB untuk input datetime-local
const toWIBLocal = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  // Geser +7 jam
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 16)
}

// Konversi "YYYY-MM-DDTHH:mm" WIB → UTC ISO string untuk disimpan ke Supabase
const fromWIBLocal = (localStr) => {
  if (!localStr) return null
  // Anggap input adalah WIB, kurangi 7 jam untuk dapat UTC
  const d = new Date(localStr + ':00Z') // parse as UTC dulu
  const utc = new Date(d.getTime() - 7 * 60 * 60 * 1000)
  return utc.toISOString()
}

const openModal = (ujian = null) => {
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
      status: ujian.status
    }
  }
  showModal.value = true
}

const fetchData = async () => {
  loading.value = true
  const guruId = authStore.user.id

  // Fetch mapel yang ditugaskan
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
  if (!form.value.nama || !form.value.mapel_id || !form.value.kelas_id || !form.value.tanggal_mulai) {
    return Swal.fire('Peringatan', 'Mohon lengkapi semua field wajib', 'warning')
  }

  saving.value = true
  const payload = {
    ...form.value,
    tanggal_mulai: fromWIBLocal(form.value.tanggal_mulai),
    tanggal_selesai: fromWIBLocal(form.value.tanggal_selesai),
    guru_id: authStore.user.id
  }

  const { error } = editingId.value
    ? await supabase.from('ujian').update(payload).eq('id', editingId.value)
    : await supabase.from('ujian').insert([payload])

  if (error) {
    Swal.fire('Gagal', error.message, 'error')
  } else {
    Swal.fire({ icon: 'success', title: 'Berhasil!', timer: 1200, showConfirmButton: false })
    showModal.value = false
    resetForm()
    fetchData()
  }
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

// Preview konversi input ke WIB 24 jam
const previewWIB = (localStr) => {
  if (!localStr) return null
  // Input dianggap WIB, tampilkan dalam format 24 jam
  const d = new Date(localStr + ':00Z')
  const wib = new Date(d.getTime() - 7 * 60 * 60 * 1000)
  // Sebenarnya input sudah WIB, jadi langsung format saja
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
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-venus-900">Jadwal Ujian</h1>
        <p class="mt-1 text-sm text-venus-500">Buat dan kelola jadwal ujian untuk kelas Anda.</p>
      </div>
      <PrimaryButton @click="openModal()">
        <Plus :size="16" />
        Buat Ujian
      </PrimaryButton>
    </div>

    <!-- Table -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <!-- Skeleton -->
      <div v-if="loading" class="divide-y divide-venus-50">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-6 py-4">
          <div class="h-4 w-32 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 flex-1 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 w-24 animate-pulse rounded-full bg-venus-100" />
          <div class="h-4 w-20 animate-pulse rounded-full bg-venus-100" />
        </div>
      </div>

      <!-- Empty -->
      <EmptyState
        v-else-if="ujianList.length === 0"
        title="Belum ada ujian"
        description="Buat jadwal ujian pertama untuk kelas Anda."
      >
        <template #action>
          <PrimaryButton @click="openModal()">Buat Ujian</PrimaryButton>
        </template>
      </EmptyState>

      <!-- Table -->
      <table v-else class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-venus-100 bg-venus-50/60">
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Nama Ujian</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Mapel</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Kelas</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Durasi</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Mulai</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Status</th>
            <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-right">Aksi</th>
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
                  @click="openModal(ujian)"
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

    <!-- Modal Buat/Edit Ujian -->
    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @mousedown.self="showModal = false">
      <div class="absolute inset-0 bg-venus-900/40 backdrop-blur-sm" @click="showModal = false" />
      <div class="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-venus-100 bg-white shadow-venus">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-venus-100 px-6 py-5">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <CalendarDays :size="18" />
            </div>
            <h3 class="text-base font-bold text-venus-900">{{ editingId ? 'Edit Ujian' : 'Buat Ujian Baru' }}</h3>
          </div>
          <button type="button" class="pressable-soft rounded-lg p-1.5 text-venus-400 hover:bg-venus-100" @click="showModal = false">
            <X :size="18" />
          </button>
        </div>

        <!-- Body -->
        <div class="space-y-4 px-6 py-6">
          <FormInput v-model="form.nama" label="Nama Ujian *" placeholder="Contoh: UTS Matematika Ganjil 2026" />

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Mata Pelajaran *</label>
              <AppSelect v-model="form.mapel_id" placeholder="Pilih Mapel" :options="mapels.map(m => ({ value: m.id, label: m.nama }))" />
            </div>
            <div class="space-y-1.5">
              <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Kelas *</label>
              <AppSelect v-model="form.kelas_id" placeholder="Pilih Kelas" :options="kelasList.map(k => ({ value: k.id, label: k.nama }))" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Tanggal Mulai *</label>
              <input v-model="form.tanggal_mulai" type="datetime-local" class="form-input text-sm" />
              <p class="ml-1 text-[10px] text-venus-400">
                <template v-if="form.tanggal_mulai">
                  Asia/Jakarta: <span class="font-semibold text-primary-600">{{ previewWIB(form.tanggal_mulai) }}</span>
                </template>
                <template v-else>Waktu dalam zona WIB (Asia/Jakarta, UTC+7)</template>
              </p>
            </div>
            <div class="space-y-1.5">
              <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Tanggal Selesai</label>
              <input v-model="form.tanggal_selesai" type="datetime-local" class="form-input text-sm" />
              <p class="ml-1 text-[10px] text-venus-400">
                <template v-if="form.tanggal_selesai">
                  Asia/Jakarta: <span class="font-semibold text-primary-600">{{ previewWIB(form.tanggal_selesai) }}</span>
                </template>
                <template v-else>Waktu dalam zona WIB (Asia/Jakarta, UTC+7)</template>
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
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
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 border-t border-venus-100 px-6 py-4">
          <button type="button" class="rounded-xl px-5 py-2.5 text-sm font-semibold text-venus-500 hover:bg-venus-50" @click="showModal = false">
            Batal
          </button>
          <PrimaryButton @click="handleSave" :loading="saving">
            <Save :size="15" />
            {{ editingId ? 'Simpan Perubahan' : 'Buat Ujian' }}
          </PrimaryButton>
        </div>
      </div>
    </div>
  </div>
</template>
