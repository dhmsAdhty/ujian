<script setup>
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { Search, FileSpreadsheet, CheckCircle2, Clock, Edit3, RotateCcw } from 'lucide-vue-next'
import { GlassCard, PrimaryButton, EmptyState, AppSelect } from '@/components/ui'
import KoreksiPanel from '@/components/guru/KoreksiPanel.vue'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const authStore = useAuthStore()
const loading = ref(true)
const results = ref([])
const exams = ref([])
const selectedExam = ref('')
const selectedMapel = ref('') // filter per mapel
const searchQuery = ref('')
const selectedResult = ref(null)

// Daftar mapel unik dari ujian guru
const mapelList = computed(() => {
  const seen = new Set()
  return exams.value
    .filter(e => e.mapel?.nama && !seen.has(e.mapel.nama) && seen.add(e.mapel.nama))
    .map(e => ({ id: e.mapel.nama, nama: e.mapel.nama }))
})

// Ujian yang difilter berdasarkan mapel aktif
const filteredExams = computed(() =>
  selectedMapel.value
    ? exams.value.filter(e => e.mapel?.nama === selectedMapel.value)
    : exams.value
)

// Filter hasil berdasarkan search + ujian + mapel
const filteredResults = computed(() => {
  let data = results.value
  if (selectedMapel.value) {
    const ids = new Set(filteredExams.value.map(e => e.id))
    data = data.filter(r => ids.has(r.exam_id))
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    data = data.filter(r => r.profiles?.full_name?.toLowerCase().includes(q))
  }
  return data
})

// Summary stats dari data yang sudah difilter
const stats = computed(() => {
  const data = filteredResults.value
  if (!data.length) return { total: 0, avgNilai: '—', lulus: 0, belumDinilai: 0 }
  const nilaiList = data.filter(r => r.pg_score != null).map(r => r.pg_score)
  const avgNilai = nilaiList.length ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) : '—'
  const lulus = nilaiList.filter(s => s >= 70).length
  const belumDinilai = data.filter(r => r.essayStatus === 'pending').length
  return { total: data.length, avgNilai, lulus, belumDinilai }
})

// Chart: tertinggi & terendah per mapel
// Statistik per mapel untuk keterangan samping
const statsPerMapel = computed(() => {
  const map = {}
  results.value.forEach(r => {
    if (r.pg_score == null) return
    const nama = r.ujian?.mapel?.nama || '—'
    if (!map[nama]) map[nama] = { nama, values: [], siswa: [] }
    map[nama].values.push(Number(r.pg_score))
    map[nama].siswa.push({ nama: r.profiles?.full_name || '—', nilai: Number(r.pg_score) })
  })
  return Object.values(map).map(m => {
    const sorted = [...m.siswa].sort((a, b) => b.nilai - a.nilai)
    return {
      mapel: m.nama,
      tertinggi: sorted[0] || null,
      terendah: sorted[sorted.length - 1] || null,
      total: m.values.length
    }
  })
})

// Pie chart: distribusi nilai semua mapel (A/B/C/D)
const chartPerMapel = computed(() => {
  const data = results.value.filter(r => r.pg_score != null)
  if (!data.length) return null

  const grades = { 'A (≥90)': 0, 'B (75–89)': 0, 'C (60–74)': 0, 'D (<60)': 0 }
  data.forEach(r => {
    const n = Number(r.pg_score)
    if (n >= 90) grades['A (≥90)']++
    else if (n >= 75) grades['B (75–89)']++
    else if (n >= 60) grades['C (60–74)']++
    else grades['D (<60)']++
  })

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} siswa ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 11 } },
    color: ['#10b981', '#6366f1', '#f59e0b', '#ef4444'],
    series: [{
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['38%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: Object.entries(grades).map(([name, value]) => ({ name, value }))
    }]
  }
})

const fetchData = async () => {
  loading.value = true

  const { data: examData } = await supabase
    .from('ujian')
    .select('id, nama, mapel(nama), kelas(nama)')
    .eq('guru_id', authStore.user.id)
    .order('tanggal_mulai', { ascending: false })
  exams.value = examData || []

  let query = supabase
    .from('exam_results')
    .select('*, profiles!exam_results_siswa_id_fkey(full_name, email), ujian(nama, mapel(nama), kelas(nama))')
    .order('submitted_at', { ascending: false })

  if (selectedExam.value) {
    query = query.eq('exam_id', selectedExam.value)
  } else if (exams.value.length > 0) {
    query = query.in('exam_id', exams.value.map(e => e.id))
  }

  const { data: resultData, error } = await query

  if (error) {
    Swal.fire('Error', 'Gagal memuat rekap nilai', 'error')
  } else {
    results.value = (resultData || []).map(r => {
      const essayScoreObj = r.essay_score && typeof r.essay_score === 'object' ? r.essay_score : null
      const isGraded = essayScoreObj && Object.keys(essayScoreObj).length > 0
      return {
        ...r,
        essayStatus: isGraded ? 'graded' : 'pending'
      }
    })
  }

  loading.value = false
}

onMounted(fetchData)

const onExamChange = () => fetchData()

const onMapelChange = (mapel) => {
  selectedMapel.value = mapel
  selectedExam.value = ''
}

const exportToExcel = () => {
  if (filteredResults.value.length === 0) return
  const data = filteredResults.value.map(r => ({
    'Nama Siswa': r.profiles?.full_name || '—',
    'Email': r.profiles?.email || '—',
    'Ujian': r.ujian?.nama || '—',
    'Mapel': r.ujian?.mapel?.nama || '—',
    'Kelas': r.ujian?.kelas?.nama || '—',
    'Waktu Selesai': new Date(r.submitted_at).toLocaleString('id-ID'),
    'Nilai Akhir': r.pg_score ?? '—',
    'Status Essay': r.essayStatus === 'graded' ? 'Sudah Dinilai' : 'Belum dinilai',
    'Total Pelanggaran': r.violations
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai')
  XLSX.writeFile(wb, `Rekap_Nilai_CBT_${new Date().toLocaleDateString('id-ID')}.xlsx`)
}

const resetSatu = async (res) => {
  const confirm = await Swal.fire({
    title: 'Reset Jawaban?',
    text: `Jawaban ${res.profiles?.full_name} akan dihapus dan siswa bisa mengerjakan ulang.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Reset',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444'
  })
  if (!confirm.isConfirmed) return

  const { error: delErr } = await supabase.from('exam_results').delete().eq('id', res.id)
  if (delErr) {
    const { error: updErr } = await supabase.from('exam_results')
      .update({ answers: {}, pg_score: null, essay_score: null, submitted_at: null, violations: 0 })
      .eq('id', res.id)
    if (updErr) return Swal.fire('Gagal', updErr.message, 'error')
  }

  Swal.fire({ icon: 'success', title: 'Jawaban direset', timer: 1200, showConfirmButton: false })
  fetchData()
}

const resetSemua = async () => {
  if (!selectedExam.value) return

  const confirm = await Swal.fire({
    title: 'Reset Semua Jawaban?',
    text: `Semua jawaban siswa pada ujian ini akan dihapus. Siswa dapat mengerjakan ulang.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Reset Semua',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444'
  })
  if (!confirm.isConfirmed) return

  const ids = filteredResults.value.map(r => r.id)
  if (!ids.length) return

  const { error: delErr } = await supabase.from('exam_results').delete().in('id', ids)
  if (delErr) {
    const { error: updErr } = await supabase.from('exam_results')
      .update({ answers: {}, pg_score: null, essay_score: null, submitted_at: null, violations: 0 })
      .in('id', ids)
    if (updErr) return Swal.fire('Gagal', updErr.message, 'error')
  }

  Swal.fire({ icon: 'success', title: 'Semua jawaban direset', timer: 1500, showConfirmButton: false })
  fetchData()
}

const openGradingModal = (result) => {
  selectedResult.value = result
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <!-- Mode koreksi: tampilkan KoreksiPanel inline, sembunyikan tabel -->
    <KoreksiPanel
      v-if="selectedResult"
      :result="selectedResult"
      @close="selectedResult = null"
      @saved="selectedResult = null; fetchData()"
    />

    <!-- Mode list -->
    <template v-else>
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-venus-900 tracking-tight">Rekap Nilai</h1>
        <p class="text-sm text-venus-500 mt-0.5">Pantau hasil ujian dan koreksi jawaban essay siswa.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="selectedExam && filteredResults.length > 0"
          @click="resetSemua"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-red-200 text-red-500 text-sm font-medium hover:border-red-400 hover:text-red-600 bg-white transition-colors"
        >
          <RotateCcw :size="15" />
          Reset Semua
        </button>
        <PrimaryButton @click="exportToExcel" :disabled="loading || filteredResults.length === 0">
          <FileSpreadsheet :size="16" />
          Ekspor Excel
        </PrimaryButton>
      </div>
    </div>

    <!-- Chart Tertinggi/Terendah per Mapel -->
    <div v-if="!loading && chartPerMapel" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Pie Chart -->
      <GlassCard padding="p-5">
        <p class="text-xs font-bold uppercase tracking-widest text-venus-400 mb-3">Distribusi Nilai</p>
        <VChart :option="chartPerMapel" autoresize style="height: 220px;" />
      </GlassCard>

      <!-- Keterangan per Mapel -->
      <GlassCard padding="p-5">
        <p class="text-xs font-bold uppercase tracking-widest text-venus-400 mb-3">Tertinggi & Terendah per Mapel</p>
        <div class="space-y-3">
          <div
            v-for="m in statsPerMapel"
            :key="m.mapel"
            class="rounded-xl border border-venus-100 bg-venus-50/40 px-4 py-3"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-venus-800">{{ m.mapel }}</span>
              <span class="text-[11px] text-venus-400">{{ m.total }} siswa</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="flex items-center gap-2 bg-emerald-50 rounded-lg px-2.5 py-2">
                <div class="w-1.5 h-8 rounded-full bg-emerald-500 shrink-0"></div>
                <div>
                  <p class="text-[10px] text-emerald-600 font-semibold">Tertinggi</p>
                  <p class="text-xs font-semibold text-emerald-800 truncate max-w-[90px]">{{ m.tertinggi?.nama }}</p>
                  <p class="text-base font-bold text-emerald-700 leading-tight">{{ m.tertinggi?.nilai }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 bg-red-50 rounded-lg px-2.5 py-2">
                <div class="w-1.5 h-8 rounded-full bg-red-400 shrink-0"></div>
                <div>
                  <p class="text-[10px] text-red-500 font-semibold">Terendah</p>
                  <p class="text-xs font-semibold text-red-700 truncate max-w-[90px]">{{ m.terendah?.nama }}</p>
                  <p class="text-base font-bold text-red-600 leading-tight">{{ m.terendah?.nilai }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>

    <!-- Tab Mapel -->
    <div v-if="mapelList.length > 1" class="flex items-center gap-2 flex-wrap">
      <button
        @click="onMapelChange('')"
        class="px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
        :class="selectedMapel === '' ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-venus-200 text-venus-500 hover:border-primary-300 hover:text-primary-600'"
      >
        Semua Mapel
      </button>
      <button
        v-for="m in mapelList"
        :key="m.id"
        @click="onMapelChange(m.id)"
        class="px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
        :class="selectedMapel === m.id ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-venus-200 text-venus-500 hover:border-primary-300 hover:text-primary-600'"
      >
        {{ m.nama }}
      </button>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <GlassCard padding="p-5">
        <p class="text-xs text-venus-400 mb-1">Total Pengumpul</p>
        <p class="text-2xl font-semibold text-venus-900">{{ stats.total }}</p>
      </GlassCard>
      <GlassCard padding="p-5">
        <p class="text-xs text-venus-400 mb-1">Rata-rata Nilai</p>
        <p class="text-2xl font-semibold text-venus-900">{{ stats.avgNilai }}</p>
      </GlassCard>
      <GlassCard padding="p-5">
        <p class="text-xs text-venus-400 mb-1">Lulus (≥70)</p>
        <p class="text-2xl font-semibold text-emerald-600">{{ stats.lulus }}</p>
      </GlassCard>
      <GlassCard padding="p-5">
        <p class="text-xs text-venus-400 mb-1">Essay Belum Dinilai</p>
        <p class="text-2xl font-semibold" :class="stats.belumDinilai > 0 ? 'text-amber-600' : 'text-venus-900'">{{ stats.belumDinilai }}</p>
      </GlassCard>
    </div>

    <!-- Filters -->
    <GlassCard padding="p-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" :size="16" />
          <input v-model="searchQuery" type="text" placeholder="Cari nama siswa..." class="form-input pl-9 text-sm" />
        </div>
        <AppSelect
          v-model="selectedExam"
          placeholder="Semua Ujian"
          :options="filteredExams.map(e => ({ value: e.id, label: e.nama }))"
          class="sm:w-64"
          @update:modelValue="onExamChange"
        />
      </div>
    </GlassCard>

    <!-- Table -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-venus-100 bg-venus-50/60">
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Siswa</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Ujian</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-center">Nilai Akhir</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-center">Essay</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-center">Waktu</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-right">Aksi</th>
            </tr>
          </thead>

          <!-- Loading skeleton -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-venus-50">
              <td v-for="j in 6" :key="j" class="px-6 py-4">
                <div class="h-3.5 bg-venus-100 rounded-full animate-pulse"></div>
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="filteredResults.length === 0">
            <tr>
              <td colspan="6">
                <EmptyState title="Belum Ada Hasil" description="Belum ada siswa yang mengumpulkan jawaban." />
              </td>
            </tr>
          </tbody>

          <!-- Data -->
          <tbody v-else class="divide-y divide-venus-50">
            <tr v-for="res in filteredResults" :key="res.id" class="hover:bg-venus-50/40 transition-colors">
              <!-- Siswa -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 text-sm font-semibold flex items-center justify-center shrink-0">
                    {{ res.profiles?.full_name?.charAt(0) || '?' }}
                  </div>
                  <div>
                    <p class="font-medium text-venus-800">{{ res.profiles?.full_name || '—' }}</p>
                    <p class="text-[11px] text-venus-400">{{ res.profiles?.email || '' }}</p>
                  </div>
                </div>
              </td>

              <!-- Ujian -->
              <td class="px-6 py-4">
                <p class="text-venus-700 font-medium truncate max-w-[160px]">{{ res.ujian?.nama || '—' }}</p>
                <p class="text-[11px] text-venus-400">{{ res.ujian?.mapel?.nama }} · {{ res.ujian?.kelas?.nama }}</p>
              </td>

              <!-- Nilai Akhir -->
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-block px-2.5 py-1 rounded-lg text-sm font-semibold"
                  :class="res.pg_score == null ? 'text-venus-400' :
                    res.pg_score >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
                >
                  {{ res.pg_score ?? '—' }}
                </span>
              </td>

              <!-- Essay -->
              <td class="px-6 py-4 text-center">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  :class="res.essayStatus === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'"
                >
                  <component :is="res.essayStatus === 'graded' ? CheckCircle2 : Clock" :size="11" />
                  {{ res.essayStatus === 'graded' ? 'Sudah Dinilai' : 'Belum Dinilai' }}
                </span>
              </td>

              <!-- Waktu -->
              <td class="px-6 py-4 text-center text-xs text-venus-400">
                {{ new Date(res.submitted_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) }}
              </td>

              <!-- Aksi -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    @click="resetSatu(res)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-red-100 bg-white text-xs font-medium text-red-400 hover:border-red-300 hover:text-red-500 transition-colors"
                  >
                    <RotateCcw :size="12" />
                    Reset
                  </button>
                  <button
                    type="button"
                    @click="openGradingModal(res)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-venus-200 bg-white text-xs font-medium text-venus-600 hover:text-primary-600 hover:border-primary-200 transition-colors shadow-ios-sm"
                  >
                    <Edit3 :size="13" />
                    Koreksi
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>
    </template>
  </div>
</template>
