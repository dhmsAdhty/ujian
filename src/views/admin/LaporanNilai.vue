<script setup>
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { supabase } from '@/services/supabase'
import { Search, FileSpreadsheet, CheckCircle2, Clock, TrendingUp, Users, Award, BookOpen, Trophy, TrendingDown } from 'lucide-vue-next'
import { GlassCard, EmptyState, AppSelect } from '@/components/ui'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

use([PieChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const loading = ref(true)
const results = ref([])
const exams = ref([])
const mapels = ref([])
const kelasList = ref([])

const selectedMapel = ref('')
const selectedKelas = ref('')
const selectedExam = ref('')
const searchQuery = ref('')

const filteredExams = computed(() => {
  let list = exams.value
  if (selectedMapel.value) list = list.filter(e => e.mapel?.id === selectedMapel.value)
  if (selectedKelas.value) list = list.filter(e => e.kelas?.id === selectedKelas.value)
  return list
})

const filteredResults = computed(() => {
  let data = results.value
  const examIds = new Set(filteredExams.value.map(e => e.id))
  data = data.filter(r => examIds.has(r.exam_id))
  if (selectedExam.value) data = data.filter(r => r.exam_id === selectedExam.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    data = data.filter(r =>
      r.profiles?.full_name?.toLowerCase().includes(q) ||
      r.ujian?.nama?.toLowerCase().includes(q)
    )
  }
  return data
})

const stats = computed(() => {
  const data = filteredResults.value
  if (!data.length) return { total: 0, avgNilai: '—', lulus: 0, belumDinilai: 0 }
  const nilaiList = data.filter(r => r.pg_score != null).map(r => Number(r.pg_score))
  const avgNilai = nilaiList.length ? parseFloat((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length).toFixed(2)) : '—'
  const lulus = nilaiList.filter(s => s >= 70).length
  const belumDinilai = data.filter(r => r.essayStatus === 'pending').length
  return { total: data.length, avgNilai, lulus, belumDinilai }
})

// Pie chart: distribusi nilai (A≥90, B≥75, C≥60, D<60)
const pieOption = computed(() => {
  const data = filteredResults.value.filter(r => r.pg_score != null)
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
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    color: ['#10b981', '#6366f1', '#f59e0b', '#ef4444'],
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: Object.entries(grades).map(([name, value]) => ({ name, value }))
    }]
  }
})

// Statistik per mapel+kelas
const mapelKelasStats = computed(() => {
  const map = {}
  filteredResults.value.forEach(r => {
    if (r.pg_score == null) return
    const mapelNama = r.ujian?.mapel?.nama || '—'
    const kelasNama = r.ujian?.kelas?.nama || '—'
    const key = `${mapelNama}||${kelasNama}`
    if (!map[key]) map[key] = { mapel: mapelNama, kelas: kelasNama, items: [] }
    map[key].items.push({ nama: r.profiles?.full_name || '—', nilai: Number(r.pg_score) })
  })

  return Object.values(map).map(g => {
    const sorted = [...g.items].sort((a, b) => b.nilai - a.nilai)
    const avg = parseFloat((sorted.reduce((s, i) => s + i.nilai, 0) / sorted.length).toFixed(2))
    return {
      mapel: g.mapel,
      kelas: g.kelas,
      tertinggi: sorted[0] || null,
      terendah: sorted[sorted.length - 1] || null,
      avg,
      total: sorted.length
    }
  }).sort((a, b) => a.mapel.localeCompare(b.mapel))
})

const fetchData = async () => {
  loading.value = true
  const [examRes, mapelRes, kelasRes, resultRes] = await Promise.all([
    supabase.from('ujian').select('id, nama, mapel(id, nama), kelas(id, nama)').order('tanggal_mulai', { ascending: false }),
    supabase.from('mapel').select('id, nama').order('nama'),
    supabase.from('kelas').select('id, nama').order('nama'),
    supabase.from('exam_results')
      .select('*, profiles!exam_results_siswa_id_fkey(full_name, email), ujian(id, nama, mapel(nama), kelas(nama))')
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
  ])

  exams.value = examRes.data || []
  mapels.value = mapelRes.data || []
  kelasList.value = kelasRes.data || []

  if (resultRes.error) {
    Swal.fire('Error', 'Gagal memuat laporan nilai', 'error')
  } else {
    results.value = (resultRes.data || []).map(r => {
      const essayScoreObj = r.essay_score && typeof r.essay_score === 'object' ? r.essay_score : null
      const essayMarks = essayScoreObj ? Object.values(essayScoreObj) : []
      const benar = essayMarks.filter(v => v === true).length
      const total = essayMarks.length
      return { ...r, essayBenar: total > 0 ? benar : null, essayTotal: total, essayStatus: total > 0 ? 'graded' : 'pending' }
    })
  }
  loading.value = false
}

onMounted(fetchData)

const onFilterChange = () => { selectedExam.value = '' }

const exportToExcel = () => {
  if (!filteredResults.value.length) return
  const data = filteredResults.value.map(r => ({
    'Nama Siswa': r.profiles?.full_name || '—',
    'Email': r.profiles?.email || '—',
    'Ujian': r.ujian?.nama || '—',
    'Mapel': r.ujian?.mapel?.nama || '—',
    'Kelas': r.ujian?.kelas?.nama || '—',
    'Nilai Akhir': r.pg_score ?? '—',
    'Status Essay': r.essayBenar != null ? `${r.essayBenar}/${r.essayTotal} benar` : 'Belum dinilai',
    'Waktu Selesai': r.submitted_at ? new Date(r.submitted_at).toLocaleString('id-ID') : '—'
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Nilai')
  XLSX.writeFile(wb, `Laporan_Nilai_CBT_${new Date().toLocaleDateString('id-ID')}.xlsx`)
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-venus-900 tracking-tight">Laporan Nilai</h1>
        <p class="text-sm text-venus-500 mt-0.5">Rekap seluruh hasil ujian siswa lintas mapel dan kelas.</p>
      </div>
      <button
        @click="exportToExcel"
        :disabled="loading || filteredResults.length === 0"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        <FileSpreadsheet :size="16" />
        Ekspor Excel
      </button>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <GlassCard padding="p-5">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0"><Users :size="18" /></div>
          <div>
            <p class="text-xs text-venus-400">Total Pengumpul</p>
            <p class="text-2xl font-semibold text-venus-900">{{ stats.total }}</p>
          </div>
        </div>
      </GlassCard>
      <GlassCard padding="p-5">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><TrendingUp :size="18" /></div>
          <div>
            <p class="text-xs text-venus-400">Total Pengumpul</p>
            <p class="text-2xl font-semibold text-venus-900">{{ stats.total }}</p>
          </div>
        </div>
      </GlassCard>
      <GlassCard padding="p-5">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Award :size="18" /></div>
          <div>
            <p class="text-xs text-venus-400">Lulus (≥70)</p>
            <p class="text-2xl font-semibold text-emerald-600">{{ stats.lulus }}</p>
          </div>
        </div>
      </GlassCard>
      <GlassCard padding="p-5">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><BookOpen :size="18" /></div>
          <div>
            <p class="text-xs text-venus-400">Essay Belum Dinilai</p>
            <p class="text-2xl font-semibold" :class="stats.belumDinilai > 0 ? 'text-amber-600' : 'text-venus-900'">{{ stats.belumDinilai }}</p>
          </div>
        </div>
      </GlassCard>
    </div>

    <!-- Filters -->
    <GlassCard padding="p-4">
      <div class="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div class="relative flex-1 min-w-[180px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" :size="16" />
          <input v-model="searchQuery" type="text" placeholder="Cari siswa atau ujian..." class="form-input pl-9 text-sm" />
        </div>
        <AppSelect v-model="selectedMapel" placeholder="Semua Mapel" :options="mapels.map(m => ({ value: m.id, label: m.nama }))" class="sm:w-48" @update:modelValue="onFilterChange" />
        <AppSelect v-model="selectedKelas" placeholder="Semua Kelas" :options="kelasList.map(k => ({ value: k.id, label: k.nama }))" class="sm:w-48" @update:modelValue="onFilterChange" />
        <AppSelect v-model="selectedExam" placeholder="Semua Ujian" :options="filteredExams.map(e => ({ value: e.id, label: e.nama }))" class="sm:w-56" />
      </div>
    </GlassCard>

    <!-- Chart + Statistik per Mapel/Kelas -->
    <div v-if="!loading && filteredResults.length > 0" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Pie Chart -->
      <GlassCard padding="p-5" class="flex flex-col">
        <p class="text-xs font-bold uppercase tracking-widest text-venus-400 mb-4">Distribusi Nilai</p>
        <VChart :option="pieOption" autoresize class="flex-1 min-h-[260px]" />
      </GlassCard>

      <!-- Statistik per Mapel + Kelas -->
      <div class="lg:col-span-2 space-y-3">
        <p class="text-xs font-bold uppercase tracking-widest text-venus-400">Tertinggi & Terendah per Mapel / Kelas</p>
        <div
          v-for="g in mapelKelasStats"
          :key="`${g.mapel}-${g.kelas}`"
          class="bg-white rounded-xl border border-venus-100 p-4 space-y-3"
        >
          <!-- Header mapel kelas -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-semibold text-venus-800">{{ g.mapel }}</span>
              <span class="mx-1.5 text-venus-300">·</span>
              <span class="text-xs text-venus-500">{{ g.kelas }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-venus-400 bg-venus-50 px-2.5 py-1 rounded-lg">
              <Users :size="11" />
              {{ g.total }} siswa · rata-rata <span class="font-semibold text-venus-700 ml-1">{{ g.avg }}</span>
            </div>
          </div>

          <!-- Tertinggi & Terendah -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex items-center gap-3 bg-emerald-50 rounded-lg px-3 py-2.5">
              <div class="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Trophy :size="13" />
              </div>
              <div class="min-w-0">
                <p class="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Tertinggi</p>
                <p class="text-xs font-semibold text-emerald-800 truncate">{{ g.tertinggi?.nama || '—' }}</p>
                <p class="text-lg font-bold text-emerald-700 leading-tight">{{ g.tertinggi?.nilai ?? '—' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 bg-red-50 rounded-lg px-3 py-2.5">
              <div class="w-7 h-7 rounded-lg bg-red-400 text-white flex items-center justify-center shrink-0">
                <TrendingDown :size="13" />
              </div>
              <div class="min-w-0">
                <p class="text-[10px] text-red-500 font-semibold uppercase tracking-wider">Terendah</p>
                <p class="text-xs font-semibold text-red-700 truncate">{{ g.terendah?.nama || '—' }}</p>
                <p class="text-lg font-bold text-red-600 leading-tight">{{ g.terendah?.nilai ?? '—' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="mapelKelasStats.length === 0" class="text-center text-sm text-venus-400 py-8">
          Belum ada data nilai untuk ditampilkan.
        </div>
      </div>
    </div>

    <!-- Table -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-venus-100 bg-venus-50/60">
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Siswa</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Ujian</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Mapel / Kelas</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-center">Nilai Akhir</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-center">Essay</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-center">Waktu</th>
            </tr>
          </thead>

          <tbody v-if="loading">
            <tr v-for="i in 6" :key="i" class="border-b border-venus-50">
              <td v-for="j in 6" :key="j" class="px-6 py-4">
                <div class="h-3.5 bg-venus-100 rounded-full animate-pulse"></div>
              </td>
            </tr>
          </tbody>

          <tbody v-else-if="filteredResults.length === 0">
            <tr><td colspan="6"><EmptyState title="Belum Ada Data" description="Belum ada siswa yang mengumpulkan jawaban ujian." /></td></tr>
          </tbody>

          <tbody v-else class="divide-y divide-venus-50">
            <tr v-for="res in filteredResults" :key="res.id" class="hover:bg-venus-50/40 transition-colors">
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
              <td class="px-6 py-4">
                <p class="text-venus-700 font-medium truncate max-w-[160px]">{{ res.ujian?.nama || '—' }}</p>
              </td>
              <td class="px-6 py-4">
                <p class="text-venus-700 text-xs font-medium">{{ res.ujian?.mapel?.nama || '—' }}</p>
                <p class="text-[11px] text-venus-400">{{ res.ujian?.kelas?.nama || '—' }}</p>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="inline-block px-2.5 py-1 rounded-lg text-sm font-semibold"
                  :class="res.pg_score == null ? 'text-venus-400' : res.pg_score >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'">
                  {{ res.pg_score ?? '—' }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  :class="res.essayStatus === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'">
                  <component :is="res.essayStatus === 'graded' ? CheckCircle2 : Clock" :size="11" />
                  {{ res.essayStatus === 'graded' ? `${res.essayBenar}/${res.essayTotal} benar` : 'Belum' }}
                </span>
              </td>
              <td class="px-6 py-4 text-center text-xs text-venus-400">
                {{ res.submitted_at ? new Date(res.submitted_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>
  </div>
</template>
