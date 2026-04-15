<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/services/supabase'
import { Settings, ShieldAlert, Save, ChevronDown, Calculator } from 'lucide-vue-next'
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

onMounted(fetchSettings)
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

    </template>
  </div>
</template>
