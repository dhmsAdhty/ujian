<script setup>
import { ref, watch, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { ChevronRight, CheckCircle2, XCircle, Minus, Save, RotateCcw } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const props = defineProps({
  result: { type: Object, default: null }
})
const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const saving = ref(false)
const soalList = ref([])

// essayMarks: soal_id -> nilai angka (0 sampai nilaiPerSoalEssay) | null (belum dinilai)
const essayMarks = ref({})

// Settings dari app_settings
const nilaiMaxPg = ref(70)
const jumlahSoalEssay = ref(3)

const nilaiMaxEssay = computed(() => 100 - nilaiMaxPg.value)
const nilaiPerSoalEssay = computed(() =>
  jumlahSoalEssay.value > 0
    ? parseFloat((nilaiMaxEssay.value / jumlahSoalEssay.value).toFixed(2))
    : 0
)

watch(() => props.result, async (val) => {
  if (!val) return
  soalList.value = []
  essayMarks.value = {}
  loading.value = true

  // Fetch nilai_max_pg & jumlah_soal_essay dari app_settings
  const { data: settingData } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['nilai_max_pg', 'jumlah_soal_essay'])
  ;(settingData || []).forEach(row => {
    if (row.key === 'nilai_max_pg') nilaiMaxPg.value = Number(row.value)
    if (row.key === 'jumlah_soal_essay') jumlahSoalEssay.value = Number(row.value)
  })

  const { data } = await supabase
    .from('ujian_soal')
    .select('urutan, bank_soal(id, konten, tipe_soal, kunci_jawaban, options, judul)')
    .eq('ujian_id', val.exam_id)
    .order('urutan', { ascending: true })

  soalList.value = (data || []).map(r => r.bank_soal)

  // Pre-fill essay skor
  soalList.value.forEach(s => {
    if (s.tipe_soal === 'essay') {
      const existing = val.essay_score?.[s.id]
      if (existing == null) {
        essayMarks.value[s.id] = null
      } else if (existing === true) {
        essayMarks.value[s.id] = nilaiPerSoalEssay.value
      } else if (existing === false) {
        essayMarks.value[s.id] = 0
      } else {
        essayMarks.value[s.id] = Number(existing)
      }
    }
  })

  // Sinkronkan nilai PG dan overall agar tidak ada bug render (re-calculate in case config changed)
  const pgSoalList = soalList.value.filter(s => s.tipe_soal !== 'essay')
  const totalSoalPg = pgSoalList.length
  const pgBenarCount = pgSoalList.filter(s => isPgBenar(s)).length

  let prevPgScore = totalSoalPg > 0 ? parseFloat((pgBenarCount / totalSoalPg * nilaiMaxPg.value).toFixed(2)) : 0
  let prevEssayScore = Object.values(essayMarks.value).reduce((sum, val) => sum + (val || 0), 0)
  let calcAkhir = parseFloat((prevPgScore + prevEssayScore).toFixed(2))

  if (val.pg_score !== calcAkhir) {
    await supabase.from('exam_results').update({
      pg_score: calcAkhir,
      pg_correct: pgBenarCount,
      total_soal: soalList.value.length
    }).eq('id', val.id)
    val.pg_score = calcAkhir
    val.pg_correct = pgBenarCount
    val.total_soal = soalList.value.length
  }

  loading.value = false
}, { immediate: true })

const getJawaban = (soalId) => props.result?.answers?.[soalId] ?? null

const isDipilihSiswa = (soalId, optLabel) => {
  const jawaban = getJawaban(soalId)
  if (!jawaban) return false
  return Array.isArray(jawaban) ? jawaban.includes(optLabel) : jawaban === optLabel
}

const isPgBenar = (soal) => {
  const jawaban = getJawaban(soal.id)
  if (!jawaban) return false
  if (soal.tipe_soal === 'pilihan_ganda_kompleks') {
    const kunciLabels = (soal.options || []).filter(o => o.is_correct).map(o => o.label)
    const jawabanArr = Array.isArray(jawaban) ? jawaban : [jawaban]
    return jawabanArr.length === kunciLabels.length &&
      jawabanArr.every(j => kunciLabels.includes(j))
  }
  if (soal.kunci_jawaban) return jawaban === soal.kunci_jawaban
  return (soal.options || []).find(o => o.label === jawaban)?.is_correct === true
}

const isKunci = (soal, optLabel) => {
  if (soal.tipe_soal === 'pilihan_ganda_kompleks') {
    return (soal.options || []).find(o => o.label === optLabel)?.is_correct === true
  }
  if (soal.kunci_jawaban) return soal.kunci_jawaban === optLabel
  return (soal.options || []).find(o => o.label === optLabel)?.is_correct === true
}

const pgStats = computed(() => {
  const pgSoal = soalList.value.filter(s => s.tipe_soal !== 'essay')
  const benar = pgSoal.filter(s => isPgBenar(s)).length
  return { benar, total: pgSoal.length }
})

const essayStats = computed(() => {
  const essaySoal = soalList.value.filter(s => s.tipe_soal === 'essay')
  const totalSkor = essaySoal.reduce((sum, s) => sum + (essayMarks.value[s.id] || 0), 0)
  const dinilai = essaySoal.filter(s => essayMarks.value[s.id] != null).length
  return { totalSkor, total: essaySoal.length, dinilai }
})

const calcNilaiPg = computed(() => {
  const totalPg = pgStats.value.total
  if (!totalPg) return 0
  return parseFloat((pgStats.value.benar / totalPg * nilaiMaxPg.value).toFixed(2))
})

const calcNilaiAkhir = computed(() => {
  return parseFloat((calcNilaiPg.value + essayStats.value.totalSkor).toFixed(2))
})

const resetJawaban = async () => {
  const confirm = await Swal.fire({
    title: 'Reset Jawaban Siswa?',
    text: `Jawaban ${props.result.profiles?.full_name} akan dihapus dan siswa bisa mengerjakan ulang.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Reset',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444'
  })
  if (!confirm.isConfirmed) return

  const { error: deleteError } = await supabase
    .from('exam_results')
    .delete()
    .eq('id', props.result.id)

  if (deleteError) {
    const { error: updateError } = await supabase
      .from('exam_results')
      .update({ answers: {}, pg_score: null, essay_score: null, submitted_at: null, violations: 0 })
      .eq('id', props.result.id)
    if (updateError) { Swal.fire('Gagal', updateError.message, 'error'); return }
  }

  Swal.fire({ icon: 'success', title: 'Jawaban direset', timer: 1500, showConfirmButton: false })
  emit('saved')
}

const save = async () => {
  saving.value = true

  const essayScoreObj = {}
  Object.entries(essayMarks.value).forEach(([id, val]) => {
    if (val != null) essayScoreObj[id] = val
  })

  const finalScore = calcNilaiAkhir.value

  const { error } = await supabase
    .from('exam_results')
    .update({
      essay_score: Object.keys(essayScoreObj).length ? essayScoreObj : null,
      pg_score: finalScore,
      pg_correct: pgStats.value.benar,
      total_soal: soalList.value.length
    })
    .eq('id', props.result.id)

  saving.value = false

  if (error) {
    Swal.fire('Gagal', error.message, 'error')
  } else {
    Swal.fire({
      icon: 'success',
      title: `Koreksi disimpan · Nilai Akhir: ${finalScore}`,
      html: `PG: <b>${calcNilaiPg.value}</b> + Essay: <b>${essayStats.value.totalSkor}</b>`,
      timer: 2000,
      showConfirmButton: false
    })
    emit('saved')
  }
}
</script>

<template>
  <div v-if="result" class="space-y-5 animate-fade-in">

    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm">
      <button
        @click="$emit('close')"
        class="text-venus-400 hover:text-primary-600 transition-colors"
      >
        Rekap Nilai
      </button>
      <ChevronRight :size="14" class="text-venus-300" />
      <span class="text-venus-700 font-medium">Koreksi Jawaban</span>
      <ChevronRight :size="14" class="text-venus-300" />
      <span class="text-venus-500 truncate max-w-[200px]">{{ result.profiles?.full_name }}</span>
    </nav>

    <!-- Info bar -->
    <div class="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-white border border-venus-100">
      <div class="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 font-semibold text-sm flex items-center justify-center shrink-0">
        {{ result.profiles?.full_name?.charAt(0) }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-venus-800 text-sm">{{ result.profiles?.full_name }}</p>
        <p class="text-xs text-venus-400">{{ result.ujian?.nama }} · {{ result.ujian?.mapel?.nama }} · {{ result.ujian?.kelas?.nama }}</p>
      </div>
      <!-- Stats -->
      <div class="flex items-center gap-3 text-xs">
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">
          <CheckCircle2 :size="12" />
          PG: {{ result.pg_correct ?? pgStats.benar }}/{{ pgStats.total }}
        </div>
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700">
          <CheckCircle2 :size="12" />
          Essay Dinilai: {{ essayStats.dinilai }}/{{ essayStats.total }}
        </div>
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 font-semibold">
          Nilai Akhir: {{ calcNilaiAkhir }}
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
    </div>

    <!-- Soal list -->
    <div v-else class="space-y-3">
      <div
        v-for="(soal, idx) in soalList"
        :key="soal.id"
        class="rounded-xl border overflow-hidden bg-white"
        :class="{
          'border-emerald-200': soal.tipe_soal !== 'essay' && isPgBenar(soal),
          'border-red-200': soal.tipe_soal !== 'essay' && !isPgBenar(soal) && getJawaban(soal.id),
          'border-slate-100': soal.tipe_soal !== 'essay' && !getJawaban(soal.id),
          'border-blue-100': soal.tipe_soal === 'essay'
        }"
      >
        <!-- Soal header -->
        <div class="flex items-start gap-3 px-4 py-3 border-b border-inherit bg-slate-50/50">
          <span class="w-6 h-6 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
            {{ idx + 1 }}
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                :class="soal.tipe_soal === 'essay' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'">
                {{ soal.tipe_soal === 'essay' ? 'Essay' : 'PG' }}
              </span>
              <template v-if="soal.tipe_soal !== 'essay'">
                <span v-if="isPgBenar(soal)" class="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                  <CheckCircle2 :size="11" /> Benar
                </span>
                <span v-else-if="getJawaban(soal.id)" class="inline-flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                  <XCircle :size="11" /> Salah
                </span>
                <span v-else class="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <Minus :size="11" /> Tidak dijawab
                </span>
              </template>
            </div>
            <p class="text-sm text-slate-700 leading-relaxed">{{ soal.konten }}</p>
          </div>
        </div>

        <!-- PG: opsi -->
        <div v-if="soal.tipe_soal !== 'essay'" class="px-4 py-3 space-y-1.5">
          <!-- Legend -->
          <div class="flex items-center gap-3 mb-2.5 flex-wrap">
            <div class="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
              <span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span> Kunci Jawaban
            </div>
            <div class="flex items-center gap-1.5 text-[10px] text-blue-700 font-semibold">
              <span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span> Jawaban Siswa
            </div>
            <div v-if="soal.tipe_soal === 'pilihan_ganda_kompleks'" class="text-[10px] text-purple-600 font-semibold italic">
              (PG Kompleks — bisa lebih dari 1 kunci)
            </div>
          </div>

          <div
            v-for="opt in (soal.options || [])"
            :key="opt.label"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border"
            :class="{
              'bg-emerald-50 border-emerald-200 text-emerald-800': isKunci(soal, opt.label) && isDipilihSiswa(soal.id, opt.label),
              'bg-emerald-50 border-emerald-200 text-emerald-700': isKunci(soal, opt.label) && !isDipilihSiswa(soal.id, opt.label),
              'bg-blue-50 border-blue-200 text-blue-800': !isKunci(soal, opt.label) && isDipilihSiswa(soal.id, opt.label),
              'bg-white border-slate-100 text-slate-400': !isKunci(soal, opt.label) && !isDipilihSiswa(soal.id, opt.label)
            }"
          >
            <span class="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0"
              :class="{
                'bg-emerald-500 text-white': isKunci(soal, opt.label) && isDipilihSiswa(soal.id, opt.label),
                'bg-emerald-400 text-white': isKunci(soal, opt.label) && !isDipilihSiswa(soal.id, opt.label),
                'bg-blue-500 text-white': !isKunci(soal, opt.label) && isDipilihSiswa(soal.id, opt.label),
                'bg-slate-100 text-slate-400': !isKunci(soal, opt.label) && !isDipilihSiswa(soal.id, opt.label)
              }"
            >{{ opt.label }}</span>
            <span class="flex-1">{{ opt.text }}</span>
            <!-- Badge kunci & siswa -->
            <div class="flex items-center gap-1.5 shrink-0">
              <span v-if="isKunci(soal, opt.label)" class="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded">
                <CheckCircle2 :size="10" /> Kunci
              </span>
              <span v-if="isDipilihSiswa(soal.id, opt.label)" class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                :class="isKunci(soal, opt.label) ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-700'"
              >
                <CheckCircle2 v-if="isKunci(soal, opt.label)" :size="10" />
                <XCircle v-else :size="10" />
                Siswa
              </span>
            </div>
          </div>

          <p v-if="!getJawaban(soal.id)" class="text-xs text-slate-400 italic px-1 py-1.5">
            Siswa tidak menjawab
          </p>
        </div>

        <!-- Essay -->
        <div v-else class="px-4 py-3 space-y-3">
          <!-- Jawaban siswa -->
          <div>
            <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5">Jawaban Siswa</p>
            <div class="bg-slate-50 rounded-lg border border-slate-100 px-3 py-2.5 text-sm text-slate-700 min-h-[52px] leading-relaxed whitespace-pre-wrap">
              {{ getJawaban(soal.id) || '—' }}
            </div>
          </div>

          <!-- Pedoman jawaban / kunci -->
          <div>
            <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5">Pedoman / Kunci Jawaban</p>
            <div class="bg-amber-50 rounded-lg border border-amber-100 px-3 py-2.5 text-sm leading-relaxed"
              :class="soal.kunci_jawaban ? 'text-amber-800' : 'text-slate-400 italic'"
            >
              {{ soal.kunci_jawaban || 'Tidak ada pedoman jawaban.' }}
            </div>
          </div>

          <!-- Input Penilaian -->
          <div>
            <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Penilaian (Beri Nilai)</p>
            <div class="flex items-center gap-3">
              <input
                v-model.number="essayMarks[soal.id]"
                type="number"
                min="0"
                :max="nilaiPerSoalEssay"
                class="form-input w-24 text-center font-bold text-blue-700 bg-blue-50/50 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20"
                placeholder="0"
              />
              <div class="text-sm">
                <span class="text-slate-400">/ maskimal</span>
                <span class="font-bold text-slate-600 ml-1">{{ nilaiPerSoalEssay }}</span>
              </div>
              <span v-if="essayMarks[soal.id] == null" class="text-[11px] text-amber-500 font-medium ml-2 px-2 py-1 rounded bg-amber-50">Belum dinilai</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save button -->
    <div class="flex justify-between items-center pt-2 pb-6">
      <button
        @click="resetJawaban"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-medium hover:border-red-400 hover:text-red-600 bg-white transition-colors"
      >
        <RotateCcw :size="15" />
        Reset Jawaban
      </button>
      <button
        @click="save"
        :disabled="saving"
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        <Save :size="15" />
        {{ saving ? 'Menyimpan...' : 'Simpan Koreksi' }}
      </button>
    </div>
  </div>
</template>
