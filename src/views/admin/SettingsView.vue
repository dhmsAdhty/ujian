<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/services/supabase'
import { Settings, ShieldAlert, Save, ChevronDown, Calculator, ScanSearch, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const loading = ref(true)
const saving = ref(false)

// Accordion state
const openSection = ref('keamanan')
const toggle = (key) => { openSection.value = openSection.value === key ? '' : key }

// Settings
const toleransiPelanggaran = ref(1)
const nilaiMaxPg = ref(70) // nilai maksimal PG (default 70)
const jumlahSoalEssay = ref(3) // jumlah soal essay
const allowPgKompleks = ref(true) // Pilihan ganda kompleks aktif/tidak

// Overrides per Kelas
const listKelas = ref([])
const kelasOverrides = ref({})

// nilai_max_essay selalu = 100 - nilai_max_pg (otomatis)
const nilaiMaxEssay = computed(() => 100 - nilaiMaxPg.value)
const nilaiPerSoalEssay = computed(() =>
  jumlahSoalEssay.value > 0
    ? parseFloat((nilaiMaxEssay.value / jumlahSoalEssay.value).toFixed(2))
    : 0
)

// Preview rumus PG
const previewBenar = ref(3)
const previewTotal = ref(5)
const previewHasil = computed(() =>
  previewTotal.value > 0
    ? parseFloat((previewBenar.value / previewTotal.value * nilaiMaxPg.value).toFixed(2))
    : 0
)

// Preview rumus Essay
const previewEssaySkor = ref([]) // nilai per soal essay
const initPreviewEssay = () => {
  previewEssaySkor.value = Array.from({ length: jumlahSoalEssay.value }, () => 0)
}
const previewEssayTotal = computed(() =>
  previewEssaySkor.value.reduce((a, b) => a + Number(b), 0)
)
const previewNilaiAkhir = computed(() => parseFloat((previewHasil.value + previewEssayTotal.value).toFixed(2)))

// Update otomatis form preview ketika jumlah essay berubah
watch(jumlahSoalEssay, (newVal) => {
  const currentLength = previewEssaySkor.value.length
  if (newVal > currentLength) {
    // Tambah input baru
    for (let i = currentLength; i < newVal; i++) {
      previewEssaySkor.value.push(0)
    }
  } else if (newVal < currentLength) {
    // Kurangi input lebih
    previewEssaySkor.value.splice(newVal)
  }
})

const fetchSettings = async () => {
  loading.value = true
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['toleransi_pelanggaran', 'nilai_max_pg', 'jumlah_soal_essay', 'allow_pg_kompleks'])

  ;(data || []).forEach(row => {
    if (row.key === 'toleransi_pelanggaran') toleransiPelanggaran.value = Number(row.value)
    if (row.key === 'nilai_max_pg') nilaiMaxPg.value = Number(row.value)
    if (row.key === 'jumlah_soal_essay') jumlahSoalEssay.value = Number(row.value)
    if (row.key === 'allow_pg_kompleks') allowPgKompleks.value = row.value === 'true'
  })

  // Fetch semua kelas & overrides
  const [kelasRes, overridesRes] = await Promise.all([
    supabase.from('kelas').select('id, nama').order('nama'),
    supabase.from('app_settings').select('key, value').like('key', 'nilai_max_pg_kelas_%')
  ])

  listKelas.value = kelasRes.data || []
  const overrides = {}
  ;(overridesRes.data || []).forEach(row => {
    const kId = row.key.replace('nilai_max_pg_kelas_', '')
    overrides[kId] = row.value ? Number(row.value) : ''
  })
  kelasOverrides.value = overrides

  initPreviewEssay()
  loading.value = false
}

const saveSection = async (section) => {
  saving.value = true
  let rows = []

  if (section === 'keamanan') {
    rows = [{ key: 'toleransi_pelanggaran', value: String(toleransiPelanggaran.value) }]
  } else if (section === 'penilaian') {
    rows = [
      { key: 'nilai_max_pg', value: String(nilaiMaxPg.value) },
      { key: 'jumlah_soal_essay', value: String(jumlahSoalEssay.value) }
    ]
    initPreviewEssay()
  } else if (section === 'penilaian_kelas') {
    rows = listKelas.value.map(k => {
      const val = kelasOverrides.value[k.id]
      return {
        key: `nilai_max_pg_kelas_${k.id}`,
        value: val !== null && val !== undefined && val !== '' ? String(val) : ''
      }
    })
  } else if (section === 'fitur') {
    rows = [{ key: 'allow_pg_kompleks', value: allowPgKompleks.value ? 'true' : 'false' }]
  }

  const { data, error } = await supabase
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' })
    .select()

  saving.value = false

  if (error) {
    Swal.fire('Gagal Menyimpan', `${error.message}\n\nCode: ${error.code}`, 'error')
  } else if (!data || data.length === 0) {
    Swal.fire('Gagal', 'Data tidak tersimpan. Kemungkinan RLS policy memblokir.', 'warning')
  } else {
    Swal.fire({ icon: 'success', title: 'Disimpan', timer: 1000, showConfirmButton: false })
  }
}

// ─── AUDIT & HITUNG ULANG NILAI ───
const auditLoading = ref(false)
const auditDone = ref(false)
const auditResults = ref([])
const auditMapelOptions = ref([])
const auditKelasOptions = ref([])
const auditSelectedMapel = ref([])
const auditSelectedKelas = ref([])
const pgCountCache = ref({})
const lastAuditFilterDesc = ref('')

const selectedAuditCount = computed(() => auditResults.value.filter(r => r.selected).length)

const fetchAuditMeta = async () => {
  const [mRes, kRes] = await Promise.all([
    supabase.from('mapel').select('id, nama').order('nama'),
    supabase.from('kelas').select('id, nama').order('nama')
  ])
  auditMapelOptions.value = mRes.data || []
  auditKelasOptions.value = kRes.data || []
}

const getPgCount = async (examId) => {
  if (pgCountCache.value[examId] !== undefined) return pgCountCache.value[examId]
  const { data } = await supabase
    .from('ujian_soal')
    .select('bank_soal(tipe_soal)')
    .eq('ujian_id', examId)
  const count = (data || []).filter(s => s.bank_soal?.tipe_soal !== 'essay').length
  pgCountCache.value[examId] = count
  return count
}

const runAudit = async () => {
  auditLoading.value = true
  auditDone.value = false
  auditResults.value = []
  pgCountCache.value = {}

  const { data, error } = await supabase
    .from('exam_results')
    .select('id, exam_id, pg_score, pg_correct, submitted_at, profiles!exam_results_siswa_id_fkey(full_name, email), ujian(id, nama, mapel(id, nama), kelas(id, nama))')
    .not('submitted_at', 'is', null)
    .not('pg_correct', 'is', null)

  if (error) {
    Swal.fire('Error', 'Gagal memuat data: ' + error.message, 'error')
    auditLoading.value = false
    return
  }

  // Fetch overrides fresh
  const { data: freshOverrides } = await supabase
    .from('app_settings')
    .select('key, value')
    .like('key', 'nilai_max_pg_kelas_%')

  const overridesMap = {}
  ;(freshOverrides || []).forEach(row => {
    const kId = row.key.replace('nilai_max_pg_kelas_', '')
    if (row.value) overridesMap[kId] = Number(row.value)
  })

  let filtered = data || []
  if (auditSelectedMapel.value.length > 0)
    filtered = filtered.filter(r => auditSelectedMapel.value.includes(r.ujian?.mapel?.id))
  if (auditSelectedKelas.value.length > 0)
    filtered = filtered.filter(r => auditSelectedKelas.value.includes(r.ujian?.kelas?.id))

  const affected = []
  for (const result of filtered) {
    const totalPg = await getPgCount(result.exam_id)
    if (totalPg === 0) continue

    const kelasId = result.ujian?.kelas?.id
    const targetMaxPg = overridesMap[kelasId] !== undefined ? overridesMap[kelasId] : nilaiMaxPg.value

    const expectedScore = parseFloat((result.pg_correct / totalPg * targetMaxPg).toFixed(2))
    const currentScore = parseFloat((result.pg_score ?? 0).toFixed(2))
    if (Math.abs(expectedScore - currentScore) > 0.01) {
      affected.push({ ...result, totalPg, expectedScore, currentScore, diff: parseFloat((expectedScore - currentScore).toFixed(2)), selected: true })
    }
  }

  auditResults.value = affected
  
  // Rekam deskripsi filter scan untuk ditampilkan di pesan sukses
  const mapelNames = auditSelectedMapel.value.length > 0
    ? auditSelectedMapel.value.map(id => auditMapelOptions.value.find(m => m.id === id)?.nama).filter(Boolean).join(', ')
    : 'Semua Mapel'
  const kelasNames = auditSelectedKelas.value.length > 0
    ? auditSelectedKelas.value.map(id => auditKelasOptions.value.find(k => k.id === id)?.nama).filter(Boolean).join(', ')
    : 'Semua Kelas'
  lastAuditFilterDesc.value = `Mapel: ${mapelNames} | Kelas: ${kelasNames}`

  auditDone.value = true
  auditLoading.value = false
}

const toggleSelectAll = (val) => auditResults.value.forEach(r => (r.selected = val))

const applyRecalculate = async () => {
  const toUpdate = auditResults.value.filter(r => r.selected)
  if (!toUpdate.length) return Swal.fire('Info', 'Tidak ada data yang dipilih.', 'info')

  const { isConfirmed } = await Swal.fire({
    title: 'Terapkan Hitung Ulang?',
    html: `Nilai PG dari <strong>${toUpdate.length} hasil ujian</strong> akan diperbarui menggunakan rumus baru (×${nilaiMaxPg.value}).`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Terapkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#4318ff'
  })
  if (!isConfirmed) return

  auditLoading.value = true
  let ok = 0, fail = 0
  for (const r of toUpdate) {
    const { error } = await supabase.from('exam_results').update({ pg_score: r.expectedScore }).eq('id', r.id)
    error ? fail++ : ok++
  }
  auditLoading.value = false

  if (fail === 0) {
    await Swal.fire({ icon: 'success', title: `${ok} nilai berhasil diperbarui!`, timer: 2000, showConfirmButton: false })
  } else {
    await Swal.fire('Selesai', `${ok} berhasil, ${fail} gagal.`, 'warning')
  }
  runAudit()
}

onMounted(() => {
  fetchSettings()
  fetchAuditMeta()
})
</script>

<template>
  <div class="space-y-4 animate-fade-in max-w-2xl">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-2">
      <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
        <Settings :size="20" />
      </div>
      <div>
        <h1 class="text-2xl font-semibold text-venus-900 tracking-tight">Pengaturan</h1>
        <p class="text-sm text-venus-500">Konfigurasi sistem CBT ATS.</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
    </div>

    <template v-else>

      <!-- Accordion: Keamanan Ujian -->
      <div class="rounded-2xl border border-venus-100 bg-white overflow-hidden shadow-sm">
        <button
          @click="toggle('keamanan')"
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-venus-50/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <ShieldAlert :size="16" />
            </div>
            <div class="text-left">
              <p class="text-sm font-semibold text-venus-800">Keamanan Ujian</p>
              <p class="text-xs text-venus-400">Toleransi pelanggaran pindah tab/layar</p>
            </div>
          </div>
          <ChevronDown
            :size="18"
            class="text-venus-400 transition-transform duration-200"
            :class="openSection === 'keamanan' ? 'rotate-180' : ''"
          />
        </button>

        <div v-show="openSection === 'keamanan'" class="px-5 pb-5 border-t border-venus-100 pt-4 space-y-4">
          <div>
            <label class="block text-sm font-semibold text-venus-700 mb-1">Toleransi Pelanggaran</label>
            <p class="text-xs text-venus-400 mb-3">
              Berapa kali siswa boleh pindah tab sebelum ujian otomatis dihentikan.
            </p>
            <div class="flex items-center gap-3">
              <button
                v-for="n in [1, 2, 3]"
                :key="n"
                @click="toleransiPelanggaran = n"
                class="w-16 h-16 rounded-xl border-2 text-lg font-bold transition-all"
                :class="toleransiPelanggaran === n
                  ? 'border-primary-600 bg-primary-600 text-white shadow-md'
                  : 'border-venus-200 bg-white text-venus-500 hover:border-primary-300 hover:text-primary-600'"
              >
                {{ n }}x
              </button>
            </div>
            <p class="mt-2 text-xs text-venus-400">
              <span v-if="toleransiPelanggaran === 1">Langsung dihentikan saat pertama kali pindah tab.</span>
              <span v-else-if="toleransiPelanggaran === 2">Peringatan ke-1, dihentikan ke-2.</span>
              <span v-else>Peringatan ke-1 dan ke-2, dihentikan ke-3.</span>
            </p>
          </div>
          <div class="flex justify-end">
            <button @click="saveSection('keamanan')" :disabled="saving"
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              <Save :size="14" /> {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Accordion: Fitur Aplikasi -->
      <div class="rounded-2xl border border-venus-100 bg-white overflow-hidden shadow-sm">
        <button
          @click="toggle('fitur')"
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-venus-50/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <Settings :size="16" />
            </div>
            <div class="text-left">
              <p class="text-sm font-semibold text-venus-800">Fitur Aplikasi</p>
              <p class="text-xs text-venus-400">Aktifkan atau nonaktifkan fitur spesifik</p>
            </div>
          </div>
          <ChevronDown
            :size="18"
            class="text-venus-400 transition-transform duration-200"
            :class="openSection === 'fitur' ? 'rotate-180' : ''"
          />
        </button>

        <div v-show="openSection === 'fitur'" class="px-5 pb-5 border-t border-venus-100 pt-4 space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <label class="block text-sm font-semibold text-venus-700 mb-1">Pilihan Ganda Kompleks</label>
              <p class="text-xs text-venus-400 max-w-[400px]">
                Jika diaktifkan, guru dapat membuat soal tipe Pilihan Ganda Kompleks (lebih dari satu jawaban benar). Jika dinonaktifkan, guru hanya bisa membuat PG biasa dan Essay.
              </p>
            </div>
            
            <!-- Toggle Component -->
            <button 
              @click="allowPgKompleks = !allowPgKompleks"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
              :class="allowPgKompleks ? 'bg-primary-600' : 'bg-venus-200'"
            >
              <span 
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="allowPgKompleks ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>
          <div class="flex justify-end pt-2">
            <button @click="saveSection('fitur')" :disabled="saving"
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              <Save :size="14" /> {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Accordion: Rumus Penilaian PG & Essay -->
      <div class="rounded-2xl border border-venus-100 bg-white overflow-hidden shadow-sm">
        <button
          @click="toggle('penilaian')"
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-venus-50/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
              <Calculator :size="16" />
            </div>
            <div class="text-left">
              <p class="text-sm font-semibold text-venus-800">Rumus Penilaian PG & Essay</p>
              <p class="text-xs text-venus-400">Atur bobot nilai PG dan Essay (total harus 100)</p>
            </div>
          </div>
          <ChevronDown
            :size="18"
            class="text-venus-400 transition-transform duration-200"
            :class="openSection === 'penilaian' ? 'rotate-180' : ''"
          />
        </button>

        <div v-show="openSection === 'penilaian'" class="px-5 pb-5 border-t border-venus-100 pt-4 space-y-5">

          <!-- ─── PG Section ─── -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[11px] font-black uppercase tracking-wide">PG</span>
              <p class="text-sm font-semibold text-venus-800">Nilai Maksimal Pilihan Ganda</p>
            </div>
            <div class="bg-indigo-50 rounded-xl px-4 py-3 text-sm text-indigo-800 font-mono mb-4">
              Nilai PG = (Jawaban Benar / Total Soal) × <span class="font-bold text-indigo-600">{{ nilaiMaxPg }}</span>
            </div>
            <p class="text-xs text-venus-400 mb-3">
              Contoh: isi <strong>70</strong> jika PG berkontribusi 70 poin dari total 100. Sisa <strong>{{ nilaiMaxEssay }}</strong> poin otomatis dialokasikan ke Essay.
            </p>
            <!-- Preset cepat -->
            <div class="flex items-center gap-2 mb-3 flex-wrap">
              <span class="text-xs text-venus-400">Preset:</span>
              <button
                v-for="preset in [50, 60, 70, 80, 100]"
                :key="preset"
                @click="nilaiMaxPg = preset"
                class="px-3 py-1 rounded-lg border text-xs font-semibold transition-all"
                :class="nilaiMaxPg === preset
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-venus-200 bg-white text-venus-500 hover:border-indigo-300 hover:text-indigo-600'"
              >
                {{ preset }}
              </button>
            </div>
            <div class="flex items-center gap-3">
              <input
                v-model.number="nilaiMaxPg"
                type="number" min="1" max="99"
                class="form-input w-28 text-center text-lg font-bold"
              />
              <span class="text-sm text-venus-400">dari 100</span>
              <span class="ml-auto text-xs text-venus-400 font-semibold">
                Sisa untuk Essay: <strong class="text-blue-600">{{ nilaiMaxEssay }}</strong>
              </span>
            </div>
          </div>

          <div class="border-t border-venus-100"></div>

          <!-- ─── Essay Section ─── -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-600 text-[11px] font-black uppercase tracking-wide">Essay</span>
              <p class="text-sm font-semibold text-venus-800">Penilaian Essay</p>
            </div>
            <div class="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800 font-mono mb-4">
              Nilai Essay = jumlah skor tiap soal essay (diisi guru saat koreksi)<br/>
              <span class="text-xs text-blue-600 font-sans">
                Maks Essay = 100 − {{ nilaiMaxPg }} = <strong>{{ nilaiMaxEssay }}</strong>
                &nbsp;|&nbsp;
                Per Soal = {{ nilaiMaxEssay }} ÷ {{ jumlahSoalEssay }} = <strong>{{ nilaiPerSoalEssay }}</strong>
              </span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-venus-600 mb-1.5">Nilai Maks Essay <span class="text-venus-400 font-normal">(otomatis)</span></label>
                <div class="form-input w-full text-center text-lg font-bold bg-slate-50 text-slate-400 cursor-not-allowed">
                  {{ nilaiMaxEssay }}
                </div>
                <p class="text-[11px] text-venus-400 mt-1">= 100 − {{ nilaiMaxPg }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-venus-600 mb-1.5">Jumlah Soal Essay</label>
                <input
                  v-model.number="jumlahSoalEssay"
                  type="number" min="1" max="20"
                  class="form-input w-full text-center text-lg font-bold"
                />
                <p class="text-[11px] text-venus-400 mt-1">Nilai per soal: <strong class="text-blue-600">{{ nilaiPerSoalEssay }}</strong></p>
              </div>
            </div>
          </div>

          <div class="border-t border-venus-100"></div>

          <!-- ─── Overrides Per Kelas Section ─── -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 text-purple-600 text-[11px] font-black uppercase tracking-wide">Override</span>
              <p class="text-sm font-semibold text-venus-800">Bobot Nilai PG Khusus Per Kelas</p>
            </div>
            <p class="text-xs text-venus-400 mb-4">
              Atur nilai maksimal PG spesifik untuk kelas tertentu jika berbeda dari global (misal: SMP diisi 100). Kosongkan untuk mengikuti nilai global (<strong>{{ nilaiMaxPg }}</strong>).
            </p>

            <div id="tour-tabel-override" class="border border-venus-100 rounded-xl overflow-hidden bg-venus-50/20 max-h-60 overflow-y-auto mb-4">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-venus-50 border-b border-venus-100 text-venus-400">
                    <th class="px-4 py-2.5 font-bold uppercase">Nama Kelas</th>
                    <th class="px-4 py-2.5 font-bold uppercase text-right">Nilai Maksimal PG</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-venus-50">
                  <tr v-for="k in listKelas" :key="k.id" class="hover:bg-white transition-colors">
                    <td class="px-4 py-3 font-medium text-venus-700">{{ k.nama }}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <input
                          v-model.number="kelasOverrides[k.id]"
                          type="number"
                          min="1"
                          max="100"
                          :placeholder="`Default Global (${nilaiMaxPg})`"
                          class="form-input w-40 text-right text-xs py-1.5 font-medium placeholder:text-venus-300"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="listKelas.length === 0">
                    <td colspan="2" class="px-4 py-3 text-center text-venus-400">Tidak ada data kelas.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-end">
              <button
                @click="saveSection('penilaian_kelas')"
                :disabled="saving"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save :size="12" />
                {{ saving ? 'Menyimpan...' : 'Simpan Bobot Kelas' }}
              </button>
            </div>
          </div>

          <div class="border-t border-venus-100"></div>

          <!-- ─── Preview Gabungan ─── -->
          <div class="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-4">
            <p class="text-xs font-bold uppercase tracking-widest text-venus-400">Preview Kalkulasi Gabungan</p>

            <!-- PG -->
            <div>
              <p class="text-[11px] font-semibold text-venus-400 uppercase tracking-widest mb-2">Komponen PG</p>
              <div class="flex items-center gap-3 flex-wrap">
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-venus-500 text-xs">Benar:</span>
                  <input v-model.number="previewBenar" type="number" min="0" :max="previewTotal" class="form-input w-16 text-center text-sm py-1.5" />
                </div>
                <span class="text-venus-300">/</span>
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-venus-500 text-xs">Total soal:</span>
                  <input v-model.number="previewTotal" type="number" min="1" class="form-input w-16 text-center text-sm py-1.5" />
                </div>
                <span class="text-venus-300">×</span>
                <span class="text-venus-600 font-semibold text-sm">{{ nilaiMaxPg }}</span>
                <span class="text-venus-300">=</span>
                <div class="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold">{{ previewHasil }}</div>
              </div>
            </div>

            <!-- Essay -->
            <div>
              <p class="text-[11px] font-semibold text-venus-400 uppercase tracking-widest mb-2">Komponen Essay (nilai per soal maks {{ nilaiPerSoalEssay }})</p>
              <div class="flex flex-wrap gap-3">
                <div v-for="(_, i) in previewEssaySkor" :key="i" class="flex flex-col items-center gap-0.5">
                  <span class="text-[10px] text-venus-500 font-semibold">Soal {{ i + 1 }}</span>
                  <input
                    v-model.number="previewEssaySkor[i]"
                    type="number" min="0" :max="nilaiPerSoalEssay"
                    class="form-input w-16 text-center text-sm py-1.5"
                  />
                  <span class="text-[10px] text-venus-300">/ {{ nilaiPerSoalEssay }}</span>
                </div>
                <div class="flex items-center gap-2 self-center ml-1">
                  <span class="text-venus-300">=</span>
                  <div class="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-bold">{{ previewEssayTotal }}</div>
                </div>
              </div>
            </div>

            <!-- Nilai akhir -->
            <div class="flex items-center gap-3 pt-3 border-t border-slate-200">
              <span class="text-sm font-bold text-venus-700">Nilai Akhir =</span>
              <span class="text-sm text-indigo-600 font-semibold">{{ previewHasil }}</span>
              <span class="text-venus-400">+</span>
              <span class="text-sm text-blue-600 font-semibold">{{ previewEssayTotal }}</span>
              <span class="text-venus-400">=</span>
              <div class="px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-lg shadow-sm">{{ previewNilaiAkhir }}</div>
            </div>
          </div>

          <div class="flex justify-end">
            <button @click="saveSection('penilaian')" :disabled="saving"
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              <Save :size="14" /> {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Accordion: Audit & Hitung Ulang Nilai -->
      <div class="rounded-2xl border border-venus-100 bg-white overflow-hidden shadow-sm">
        <button
          id="tour-accordion-audit"
          @click="toggle('audit')"
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-venus-50/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <ScanSearch :size="16" />
            </div>
            <div class="text-left">
              <p class="text-sm font-semibold text-venus-800">Audit &amp; Hitung Ulang Nilai</p>
              <p class="text-xs text-venus-400">Deteksi dan perbaiki nilai yang dihitung dengan pengaturan lama</p>
            </div>
          </div>
          <ChevronDown
            :size="18"
            class="text-venus-400 transition-transform duration-200"
            :class="openSection === 'audit' ? 'rotate-180' : ''"
          />
        </button>

        <div v-show="openSection === 'audit'" class="px-5 pb-5 border-t border-venus-100 pt-4 space-y-4">

          <!-- Warning banner -->
          <div class="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle :size="16" class="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-semibold text-amber-700">Gunakan fitur ini dengan hati-hati</p>
              <p class="text-xs text-amber-600 mt-0.5">Fitur ini mengupdate <code class="bg-amber-100 px-1 rounded">pg_score</code> di database. Pastikan pengaturan <strong>Nilai Max PG</strong> sudah benar sebelum scan.</p>
            </div>
          </div>

          <!-- Current setting indicator -->
          <div class="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <span class="text-xs text-indigo-600">Nilai Max PG aktif saat ini:</span>
            <span class="px-3 py-1 rounded-lg bg-indigo-500 text-white text-sm font-bold">{{ nilaiMaxPg }}</span>
            <span class="text-xs text-indigo-500">→ Essay maks: <strong>{{ nilaiMaxEssay }}</strong></span>
          </div>

          <!-- Filters -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <!-- Mapel -->
            <div>
              <label class="block text-xs font-semibold text-venus-700 mb-2">Filter Mata Pelajaran <span class="text-venus-400 font-normal">(kosong = semua)</span></label>
              <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1 border border-venus-100 rounded-xl p-3 bg-venus-50/40">
                <label
                  v-for="m in auditMapelOptions" :key="m.id"
                  class="flex items-center gap-2 cursor-pointer group"
                >
                  <input type="checkbox" :value="m.id" v-model="auditSelectedMapel" class="accent-primary-600 w-3.5 h-3.5" />
                  <span class="text-sm text-venus-700 group-hover:text-primary-600 transition-colors">{{ m.nama }}</span>
                </label>
                <p v-if="auditMapelOptions.length === 0" class="text-xs text-venus-400">Memuat...</p>
              </div>
            </div>
            <!-- Kelas -->
            <div>
              <label class="block text-xs font-semibold text-venus-700 mb-2">Filter Kelas <span class="text-venus-400 font-normal">(kosong = semua)</span></label>
              <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1 border border-venus-100 rounded-xl p-3 bg-venus-50/40">
                <label
                  v-for="k in auditKelasOptions" :key="k.id"
                  class="flex items-center gap-2 cursor-pointer group"
                >
                  <input type="checkbox" :value="k.id" v-model="auditSelectedKelas" class="accent-primary-600 w-3.5 h-3.5" />
                  <span class="text-sm text-venus-700 group-hover:text-primary-600 transition-colors">{{ k.nama }}</span>
                </label>
                <p v-if="auditKelasOptions.length === 0" class="text-xs text-venus-400">Memuat...</p>
              </div>
            </div>
          </div>

          <!-- Scan Button -->
          <button
            id="tour-btn-scan-audit"
            @click="runAudit"
            :disabled="auditLoading"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            <div v-if="auditLoading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <ScanSearch v-else :size="15" />
            {{ auditLoading ? 'Memindai data...' : 'Scan Sekarang' }}
          </button>

          <!-- Results -->
          <template v-if="auditDone && !auditLoading">

            <!-- All good -->
            <div v-if="auditResults.length === 0" class="flex flex-col gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div class="flex items-center gap-3">
                <CheckCircle2 :size="16" class="text-emerald-500 shrink-0" />
                <p class="text-sm text-emerald-700 font-semibold">Hasil scan konsisten! Tidak ada nilai bermasalah yang perlu diperbaiki.</p>
              </div>
              <div class="ml-7 text-[11px] text-emerald-600 bg-emerald-100/30 border border-emerald-100 rounded-lg p-2 self-start font-medium">
                <span class="font-bold">Cakupan Scan:</span> {{ lastAuditFilterDesc }}
              </div>
            </div>

            <!-- Issues found -->
            <div v-else class="space-y-3">
              <!-- Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <p class="text-sm font-semibold text-red-600">{{ auditResults.length }} nilai tidak konsisten ditemukan</p>
                </div>
                <label class="flex items-center gap-1.5 text-xs text-venus-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    :checked="selectedAuditCount === auditResults.length"
                    :indeterminate="selectedAuditCount > 0 && selectedAuditCount < auditResults.length"
                    @change="e => toggleSelectAll(e.target.checked)"
                    class="accent-primary-600 w-3.5 h-3.5"
                  />
                  Pilih Semua ({{ selectedAuditCount }}/{{ auditResults.length }})
                </label>
              </div>

              <!-- Table -->
              <div class="overflow-x-auto rounded-xl border border-venus-100">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-venus-50 border-b border-venus-100">
                      <th class="px-3 py-2.5"></th>
                      <th class="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-venus-400">Siswa</th>
                      <th class="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-venus-400">Mapel / Kelas</th>
                      <th class="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-venus-400 text-center">Waktu Submit</th>
                      <th class="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-venus-400 text-center">Nilai Lama</th>
                      <th class="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-venus-400 text-center">Nilai Baru</th>
                      <th class="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-venus-400 text-center">Selisih</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-venus-50">
                    <tr
                      v-for="r in auditResults" :key="r.id"
                      class="transition-colors"
                      :class="r.selected ? 'bg-primary-50/40' : 'hover:bg-venus-50/40'"
                    >
                      <td class="px-3 py-2.5">
                        <input type="checkbox" v-model="r.selected" class="accent-primary-600 w-3.5 h-3.5" />
                      </td>
                      <td class="px-3 py-2.5">
                        <p class="text-xs font-semibold text-venus-800">{{ r.profiles?.full_name || '—' }}</p>
                        <p class="text-[10px] text-venus-400">{{ r.ujian?.nama || '—' }}</p>
                      </td>
                      <td class="px-3 py-2.5">
                        <p class="text-xs text-venus-700">{{ r.ujian?.mapel?.nama || '—' }}</p>
                        <p class="text-[10px] text-venus-400">{{ r.ujian?.kelas?.nama || '—' }}</p>
                      </td>
                      <td class="px-3 py-2.5 text-center">
                        <p class="text-xs font-medium text-venus-700">{{ r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }}</p>
                        <p class="text-[10px] text-venus-400 font-mono">{{ r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' WIB' : '' }}</p>
                      </td>
                      <td class="px-3 py-2.5 text-center">
                        <span class="inline-block px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-bold">{{ r.currentScore }}</span>
                      </td>
                      <td class="px-3 py-2.5 text-center">
                        <span class="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">{{ r.expectedScore }}</span>
                      </td>
                      <td class="px-3 py-2.5 text-center">
                        <span
                          class="inline-block px-2 py-0.5 rounded-md text-xs font-bold"
                          :class="r.diff > 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'"
                        >
                          {{ r.diff > 0 ? '+' : '' }}{{ r.diff }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Apply Button -->
              <div class="flex justify-end">
                <button
                  @click="applyRecalculate"
                  :disabled="auditLoading || selectedAuditCount === 0"
                  class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <RefreshCw :size="14" />
                  Terapkan Hitung Ulang ({{ selectedAuditCount }} dipilih)
                </button>
              </div>
            </div>
          </template>

        </div>
      </div>

    </template>
  </div>
</template>
