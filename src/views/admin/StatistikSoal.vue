<script setup>
import { ref, onMounted, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  TooltipComponent, GridComponent, LegendComponent,
  AxisPointerComponent, TitleComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { supabase } from '@/services/supabase'
import { FileStack, LayoutList, FileText, Users, TrendingUp, BookOpen } from 'lucide-vue-next'
import { GlassCard } from '@/components/ui'

use([CanvasRenderer, BarChart, PieChart, LineChart, TooltipComponent, GridComponent, LegendComponent, AxisPointerComponent, TitleComponent])

// ── State ──────────────────────────────────────────────────────────────────
const loading = ref(true)
const stats = ref({ total: 0, pg: 0, essay: 0, guruCount: 0, mapelCount: 0 })
const perMapel = ref([])   // [{ nama, pg, essay }]
const perGuru = ref([])    // [{ nama, total }]
const perMonth = ref([])   // [{ month, count }]

// ── Fetch ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [soalRes, mapelRes, guruRes] = await Promise.all([
    // Ambil tanpa join dulu — join terpisah untuk hindari relasi salah nama
    supabase.from('bank_soal').select('id, tipe_soal, created_at, mapel_id, guru_id').is('deleted_at', null),
    supabase.from('mapel').select('id, nama'),
    supabase.from('profiles').select('id, full_name').eq('role', 'guru'),
  ])

  // Log error jika ada
  if (soalRes.error) console.error('bank_soal error:', soalRes.error.message)
  if (mapelRes.error) console.error('mapel error:', mapelRes.error.message)
  if (guruRes.error) console.error('profiles error:', guruRes.error.message)

  const soal = soalRes.data || []
  const mapels = mapelRes.data || []
  const guruList = guruRes.data || []

  // Build lookup maps
  const mapelMap = Object.fromEntries(mapels.map((m) => [m.id, m.nama]))
  const guruNameMap = Object.fromEntries(guruList.map((g) => [g.id, g.full_name]))

  // Summary stats
  stats.value = {
    total: soal.length,
    pg: soal.filter((s) => s.tipe_soal === 'pilihan_ganda').length,
    essay: soal.filter((s) => s.tipe_soal === 'essay').length,
    guruCount: guruList.length,
    mapelCount: mapels.length,
  }

  // Per mapel
  perMapel.value = mapels.map((m) => {
    const items = soal.filter((s) => s.mapel_id === m.id)
    return {
      nama: m.nama,
      pg: items.filter((s) => s.tipe_soal === 'pilihan_ganda').length,
      essay: items.filter((s) => s.tipe_soal === 'essay').length,
      total: items.length,
    }
  }).filter((m) => m.total > 0).sort((a, b) => b.total - a.total)

  // Per guru (top 8)
  const guruMap = {}
  soal.forEach((s) => {
    const name = guruNameMap[s.guru_id] || 'Unknown'
    guruMap[name] = (guruMap[name] || 0) + 1
  })
  perGuru.value = Object.entries(guruMap)
    .map(([nama, total]) => ({ nama, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Per bulan: tampilkan tren per HARI dalam bulan ini (bukan 12 bulan)
  const dayMap = {}
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Inisialisasi setiap hari di bulan ini dengan 0
  for (let i = 1; i <= daysInMonth; i++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    dayMap[key] = 0
  }

  soal.forEach((s) => {
    // Ambil YYYY-MM-DD
    const key = s.created_at?.slice(0, 10)
    if (key && dayMap[key] !== undefined) dayMap[key]++
  })

  perMonth.value = Object.entries(dayMap).map(([k, v]) => {
    const d = new Date(k)
    return {
      month: `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('id-ID', { month: 'short' })}`,
      count: v,
    }
  })

  loading.value = false
  } catch (e) {
    console.error('StatistikSoal error:', e)
    loading.value = false
  }
})

// ── Chart Options ──────────────────────────────────────────────────────────
const COLORS = { primary: '#4318ff', light: '#868cff', bg: '#f4f7fe', text: '#a3aed0', dark: '#1b2559' }

const pieOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'horizontal', bottom: 0, textStyle: { color: COLORS.text, fontSize: 12, fontWeight: 500 } },
  color: [COLORS.primary, COLORS.light],
  series: [{
    name: 'Tipe Soal',
    type: 'pie',
    radius: ['42%', '68%'],
    center: ['50%', '44%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold', color: COLORS.dark } },
    data: [
      { value: stats.value.pg, name: 'Pilihan Ganda' },
      { value: stats.value.essay, name: 'Essay' },
    ],
  }],
}))

const barMapelOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { bottom: 0, textStyle: { color: COLORS.text, fontSize: 11 } },
  color: [COLORS.primary, COLORS.light],
  grid: { top: '8%', left: '2%', right: '2%', bottom: '14%', containLabel: true },
  xAxis: {
    type: 'category',
    data: perMapel.value.map((m) => m.nama),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: COLORS.text, fontSize: 11, fontWeight: 500, interval: 0, rotate: perMapel.value.length > 5 ? 20 : 0 },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: COLORS.text, fontSize: 11 },
    splitLine: { lineStyle: { color: COLORS.bg, type: 'dashed' } },
  },
  series: [
    {
      name: 'Pilihan Ganda',
      type: 'bar',
      stack: 'total',
      barMaxWidth: 40,
      data: perMapel.value.map((m) => m.pg),
      itemStyle: { color: COLORS.primary, borderRadius: [0, 0, 0, 0] },
    },
    {
      name: 'Essay',
      type: 'bar',
      stack: 'total',
      barMaxWidth: 40,
      data: perMapel.value.map((m) => m.essay),
      itemStyle: { color: COLORS.light, borderRadius: [6, 6, 0, 0] },
    },
  ],
}))

const lineMonthOption = computed(() => ({
  tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}: <b>${p[0].value} soal</b>` },
  grid: { top: '10%', left: '2%', right: '2%', bottom: '8%', containLabel: true },
  xAxis: {
    type: 'category',
    data: perMonth.value.map((m) => m.month),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: COLORS.text, fontSize: 11, fontWeight: 500 },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: COLORS.text, fontSize: 11 },
    splitLine: { lineStyle: { color: COLORS.bg, type: 'dashed' } },
  },
  series: [{
    name: 'Soal Dibuat',
    type: 'line',
    smooth: true,
    data: perMonth.value.map((m) => m.count),
    symbol: 'circle',
    symbolSize: 7,
    lineStyle: { color: COLORS.primary, width: 2.5 },
    itemStyle: { color: COLORS.primary, borderColor: '#fff', borderWidth: 2 },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'rgba(67,24,255,0.15)' }, { offset: 1, color: 'rgba(67,24,255,0)' }],
      },
    },
  }],
}))

const barGuruOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { top: '4%', left: '2%', right: '4%', bottom: '4%', containLabel: true },
  xAxis: {
    type: 'value',
    axisLabel: { color: COLORS.text, fontSize: 11 },
    splitLine: { lineStyle: { color: COLORS.bg, type: 'dashed' } },
  },
  yAxis: {
    type: 'category',
    data: perGuru.value.map((g) => g.nama).reverse(),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: COLORS.dark, fontSize: 11, fontWeight: 500 },
  },
  series: [{
    name: 'Total Soal',
    type: 'bar',
    barMaxWidth: 28,
    data: perGuru.value.map((g) => g.total).reverse(),
    itemStyle: {
      borderRadius: [0, 6, 6, 0],
      color: {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
        colorStops: [{ offset: 0, color: COLORS.light }, { offset: 1, color: COLORS.primary }],
      },
    },
    label: { show: true, position: 'right', color: COLORS.text, fontSize: 11, fontWeight: 600 },
  }],
}))

// ── Summary cards ──────────────────────────────────────────────────────────
const summaryCards = computed(() => [
  { label: 'Total Soal', value: stats.value.total, icon: FileStack, color: 'bg-primary-100 text-primary-700', trend: null },
  { label: 'Pilihan Ganda', value: stats.value.pg, icon: LayoutList, color: 'bg-amber-100 text-amber-700', pct: stats.value.total ? Math.round(stats.value.pg / stats.value.total * 100) : 0 },
  { label: 'Essay', value: stats.value.essay, icon: FileText, color: 'bg-blue-100 text-blue-700', pct: stats.value.total ? Math.round(stats.value.essay / stats.value.total * 100) : 0 },
  { label: 'Guru Aktif', value: stats.value.guruCount, icon: Users, color: 'bg-emerald-100 text-emerald-700', trend: null },
  { label: 'Mata Pelajaran', value: stats.value.mapelCount, icon: BookOpen, color: 'bg-purple-100 text-purple-700', trend: null },
  { label: 'Rata-rata / Guru', value: stats.value.guruCount ? Math.round(stats.value.total / stats.value.guruCount) : 0, icon: TrendingUp, color: 'bg-rose-100 text-rose-700', trend: null },
])
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-venus-900">Statistik Bank Soal</h1>
      <p class="mt-1 text-sm text-venus-400">Ringkasan dan analisis pengisian soal oleh seluruh guru.</p>
    </div>

    <!-- Summary cards skeleton -->
    <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <div v-for="i in 6" :key="i" class="h-24 animate-pulse rounded-2xl bg-venus-100" />
    </div>

    <!-- Summary cards -->
    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <GlassCard
        v-for="card in summaryCards"
        :key="card.label"
        padding="p-4"
        class="flex flex-col gap-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl" :class="card.color">
            <component :is="card.icon" :size="18" stroke-width="2" />
          </div>
          <span v-if="card.pct !== undefined" class="text-[10px] font-black text-venus-400">{{ card.pct }}%</span>
        </div>
        <div>
          <p class="text-2xl font-black tracking-tight text-venus-900">{{ card.value.toLocaleString() }}</p>
          <p class="mt-0.5 text-[11px] font-semibold text-venus-400">{{ card.label }}</p>
        </div>
      </GlassCard>
    </div>

    <!-- Charts row 1: Line + Pie -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Line chart: trend per bulan -->
      <GlassCard padding="p-6" class="lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-venus-900">Tren Pembuatan Soal</h3>
            <p class="text-xs text-venus-400">Bulan ini</p>
          </div>
          <div class="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5">
            <TrendingUp :size="13" class="text-primary-600" />
            <span class="text-xs font-bold text-primary-700">{{ stats.total }} total</span>
          </div>
        </div>
        <div v-if="loading" class="h-52 animate-pulse rounded-xl bg-venus-100" />
        <v-chart v-else class="h-52 w-full" :option="lineMonthOption" autoresize />
      </GlassCard>

      <!-- Pie chart: PG vs Essay -->
      <GlassCard padding="p-6">
        <div class="mb-4">
          <h3 class="font-bold text-venus-900">Rasio Tipe Soal</h3>
          <p class="text-xs text-venus-400">Pilihan ganda vs essay</p>
        </div>
        <div v-if="loading" class="h-52 animate-pulse rounded-xl bg-venus-100" />
        <v-chart v-else class="h-52 w-full" :option="pieOption" autoresize />
      </GlassCard>
    </div>

    <!-- Charts row 2: Bar mapel + Bar guru -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Stacked bar: soal per mapel -->
      <GlassCard padding="p-6">
        <div class="mb-4">
          <h3 class="font-bold text-venus-900">Soal per Mata Pelajaran</h3>
          <p class="text-xs text-venus-400">Distribusi PG dan essay tiap mapel</p>
        </div>
        <div v-if="loading" class="h-64 animate-pulse rounded-xl bg-venus-100" />
        <div v-else-if="perMapel.length === 0" class="flex h-64 items-center justify-center text-sm text-venus-400">
          Belum ada data soal
        </div>
        <v-chart v-else class="h-64 w-full" :option="barMapelOption" autoresize />
      </GlassCard>

      <!-- Horizontal bar: top guru -->
      <GlassCard padding="p-6">
        <div class="mb-4">
          <h3 class="font-bold text-venus-900">Kontribusi Guru</h3>
          <p class="text-xs text-venus-400">Top 8 guru berdasarkan jumlah soal</p>
        </div>
        <div v-if="loading" class="h-64 animate-pulse rounded-xl bg-venus-100" />
        <div v-else-if="perGuru.length === 0" class="flex h-64 items-center justify-center text-sm text-venus-400">
          Belum ada data soal
        </div>
        <v-chart v-else class="w-full" :style="{ height: `${Math.max(200, perGuru.length * 44)}px` }" :option="barGuruOption" autoresize />
      </GlassCard>
    </div>

    <!-- Detail table: per mapel -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <div class="border-b border-venus-100 px-6 py-5">
        <h3 class="font-bold text-venus-900">Detail per Mata Pelajaran</h3>
        <p class="mt-0.5 text-xs text-venus-400">Rincian jumlah soal tiap mata pelajaran</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-venus-100 bg-venus-50/60 text-[10px] font-black uppercase tracking-[2px] text-venus-400">
              <th class="px-6 py-4">Mata Pelajaran</th>
              <th class="px-6 py-4 text-center">Pilihan Ganda</th>
              <th class="px-6 py-4 text-center">Essay</th>
              <th class="px-6 py-4 text-center">Total</th>
              <th class="px-6 py-4">Proporsi</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 4" :key="i" class="border-b border-venus-50">
              <td v-for="j in 5" :key="j" class="px-6 py-4">
                <div class="h-3.5 animate-pulse rounded-full bg-venus-100" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="perMapel.length === 0">
            <tr>
              <td colspan="5" class="px-6 py-10 text-center text-sm text-venus-400">Belum ada data soal</td>
            </tr>
          </tbody>
          <tbody v-else class="divide-y divide-venus-50">
            <tr v-for="m in perMapel" :key="m.nama" class="hover:bg-venus-50/40">
              <td class="px-6 py-4">
                <div class="flex items-center gap-2.5">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-xs font-black text-primary-700">
                    {{ m.nama.charAt(0) }}
                  </div>
                  <span class="font-semibold text-venus-800">{{ m.nama }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{{ m.pg }}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{{ m.essay }}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="font-black text-venus-900">{{ m.total }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-venus-100">
                    <div
                      class="h-full rounded-full bg-primary-500 transition-all duration-500"
                      :style="{ width: `${stats.total ? Math.round(m.total / stats.total * 100) : 0}%` }"
                    />
                  </div>
                  <span class="w-8 text-right text-xs font-semibold text-venus-400">
                    {{ stats.total ? Math.round(m.total / stats.total * 100) : 0 }}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>
  </div>
</template>
