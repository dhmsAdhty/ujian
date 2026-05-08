<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '@/services/supabase'
import { reportError } from '@/services/errorTracker'
import { GlassCard } from '@/components/ui'
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2, RefreshCw,
  Search, Trash2, X, ChevronRight, Shield, Clock, User,
  Globe, Code2, StickyNote, ShieldCheck, Zap,
  FlaskConical, ChevronDown, Play, RotateCcw
} from 'lucide-vue-next'

// ──────────────────────── State ────────────────────────
const loading = ref(true)
const errors = ref([])
const searchQuery = ref('')
const filterSeverity = ref('all')   // 'all' | 'critical' | 'error' | 'warning'
const filterResolved = ref('unresolved') // 'all' | 'unresolved' | 'resolved'
const selectedError = ref(null)
const savingNote = ref(false)
const noteText = ref('')
const deletingId = ref(null)

// ──────────────────────── Scenario Tester ────────────────────────
// Panel ini HANYA muncul di development (localhost).
// Di production (Cloudflare Pages) panel ini otomatis TERSEMBUNYI
// agar tidak mencemari log error asli.
const isDev = import.meta.env.DEV
const showScenarios = ref(false)
const scenarioStates = ref({}) // { [id]: 'idle' | 'running' | 'done' | 'error' }

// Daftar 8 skenario test nyata sesuai sistem CBT
const scenarios = [
  {
    id: 'type_error',
    severity: 'error',
    label: 'TypeError — Akses Properti Undefined',
    description: 'Simulasi error yang terjadi ketika data dari Supabase kosong/null dan kode langsung mengakses propertinya tanpa pengecekan.',
    badge: 'JS Runtime',
    badgeColor: 'bg-orange-100 text-orange-700',
    async run() {
      const data = null
      return data.profiles.full_name // TypeError: Cannot read properties of null
    }
  },
  {
    id: 'network_fail',
    severity: 'error',
    label: 'NetworkError — Fetch ke URL Invalid',
    description: 'Simulasi kegagalan koneksi jaringan, misalnya saat endpoint API tidak ditemukan atau server down.',
    badge: 'Network',
    badgeColor: 'bg-sky-100 text-sky-700',
    async run() {
      await fetch('https://this-endpoint-does-not-exist-cbt.invalid/api/test')
    }
  },
  {
    id: 'promise_reject',
    severity: 'error',
    label: 'UnhandledRejection — Promise Tanpa Catch',
    description: 'Simulasi Promise async yang gagal dan tidak memiliki blok .catch() — umum terjadi pada fungsi async yang lupa try/catch.',
    badge: 'Async',
    badgeColor: 'bg-purple-100 text-purple-700',
    async run() {
      // Buat promise rejection yang tidak di-handle
      Promise.reject(new Error('[Scenario] Async operation failed: ujian tidak ditemukan di database'))
      await new Promise(r => setTimeout(r, 300))
    }
  },
  {
    id: 'range_error',
    severity: 'error',
    label: 'RangeError — Stack Overflow pada Rekursi',
    description: 'Simulasi fungsi rekursif tanpa base case yang tepat, bisa terjadi pada parsing soal nested atau render komponen rekursif.',
    badge: 'JS Runtime',
    badgeColor: 'bg-orange-100 text-orange-700',
    async run() {
      function recursive(n) { return recursive(n + 1) }
      recursive(0)
    }
  },
  {
    id: 'auth_session',
    severity: 'warning',
    label: 'AuthWarning — Sesi Pengguna Tidak Valid',
    description: 'Simulasi situasi ketika token autentikasi siswa/guru sudah expired atau tidak ditemukan saat melakukan aksi penting.',
    badge: 'Auth',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    async run() {
      reportError(
        new Error('[Scenario] Session token expired atau tidak ditemukan. User perlu login ulang.'),
        { component: 'AuthGuard', severity: 'warning' }
      )
      await new Promise(r => setTimeout(r, 400))
    }
  },
  {
    id: 'supabase_timeout',
    severity: 'error',
    label: 'DatabaseError — Query Supabase Gagal',
    description: 'Simulasi kegagalan query ke Supabase, misalnya tabel tidak ditemukan, RLS policy menolak akses, atau koneksi timeout.',
    badge: 'Database',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    async run() {
      const { error } = await supabase
        .from('tabel_yang_tidak_ada_xyz_12345')
        .select('*')
        .limit(1)
      if (error) throw new Error(`[Scenario] Supabase query error: ${error.message}`)
    }
  },
  {
    id: 'upload_fail',
    severity: 'error',
    label: 'UploadError — Gagal Upload Gambar Soal',
    description: 'Simulasi kegagalan upload gambar ke Cloudinary, misalnya upload preset salah, file terlalu besar, atau koneksi terputus.',
    badge: 'Upload',
    badgeColor: 'bg-pink-100 text-pink-700',
    async run() {
      reportError(
        new Error('[Scenario] Cloudinary upload failed: Invalid upload preset "cbt_soal_images". Response 401 Unauthorized.'),
        { component: 'SoalForm', severity: 'error' }
      )
      await new Promise(r => setTimeout(r, 300))
    }
  },
  {
    id: 'critical_submit',
    severity: 'critical',
    label: 'CriticalError — Gagal Submit Hasil Ujian',
    description: 'Simulasi error kritis ketika jawaban siswa gagal tersimpan ke database saat submit ujian — data loss scenario.',
    badge: 'Critical',
    badgeColor: 'bg-red-100 text-red-700',
    async run() {
      reportError(
        new Error('[Scenario] CRITICAL: Gagal menyimpan exam_results ke Supabase. Jawaban siswa tidak tersimpan. exam_id: ujian-demo-001, siswa_id: siswa-demo-123.'),
        { component: 'ActiveExam', severity: 'critical' }
      )
      await new Promise(r => setTimeout(r, 400))
    }
  },
]

const runScenario = async (scenario) => {
  scenarioStates.value[scenario.id] = 'running'
  try {
    await scenario.run()
    scenarioStates.value[scenario.id] = 'done'
  } catch (err) {
    // Error sudah ditangkap oleh global handler, tapi kita juga
    // langsung report supaya pasti tersimpan
    reportError(err, { component: 'ScenarioTester', severity: scenario.severity })
    scenarioStates.value[scenario.id] = 'done'
  }
  // Auto-refresh list setelah 1.5 detik agar error baru muncul
  setTimeout(fetchErrors, 1500)
}

const resetScenarios = () => {
  scenarioStates.value = {}
}

// ──────────────────────── Fetch ────────────────────────
const fetchErrors = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('system_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    errors.value = data || []
  } catch (err) {
    console.error('[ErrorMonitor] Gagal mengambil data error:', err)
  } finally {
    loading.value = false
  }
}

// ──────────────────────── Computed ────────────────────────
const stats = computed(() => ({
  total: errors.value.length,
  critical: errors.value.filter(e => e.severity === 'critical').length,
  unresolved: errors.value.filter(e => !e.is_resolved).length,
  today: errors.value.filter(e => {
    const d = new Date(e.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length,
}))

const filteredErrors = computed(() => {
  return errors.value.filter(e => {
    // Filter severity
    if (filterSeverity.value !== 'all' && e.severity !== filterSeverity.value) return false
    // Filter resolved
    if (filterResolved.value === 'unresolved' && e.is_resolved) return false
    if (filterResolved.value === 'resolved' && !e.is_resolved) return false
    // Filter search
    const q = searchQuery.value.toLowerCase()
    if (q && !e.error_type?.toLowerCase().includes(q) && !e.message?.toLowerCase().includes(q) && !e.url?.toLowerCase().includes(q)) return false
    return true
  })
})

// ──────────────────────── Actions ────────────────────────
const openDetail = (err) => {
  selectedError.value = err
  noteText.value = err.notes || ''
}

const closeDetail = () => {
  selectedError.value = null
  noteText.value = ''
}

const toggleResolve = async (err) => {
  const newVal = !err.is_resolved
  const { error } = await supabase
    .from('system_errors')
    .update({
      is_resolved: newVal,
      resolved_at: newVal ? new Date().toISOString() : null
    })
    .eq('id', err.id)

  if (!error) {
    err.is_resolved = newVal
    err.resolved_at = newVal ? new Date().toISOString() : null
    if (selectedError.value?.id === err.id) {
      selectedError.value = { ...err }
    }
  }
}

const saveNote = async () => {
  if (!selectedError.value) return
  savingNote.value = true
  const { error } = await supabase
    .from('system_errors')
    .update({ notes: noteText.value })
    .eq('id', selectedError.value.id)

  if (!error) {
    selectedError.value.notes = noteText.value
    const idx = errors.value.findIndex(e => e.id === selectedError.value.id)
    if (idx !== -1) errors.value[idx].notes = noteText.value
  }
  savingNote.value = false
}

const deleteError = async (id) => {
  deletingId.value = id
  const { error } = await supabase
    .from('system_errors')
    .delete()
    .eq('id', id)

  if (!error) {
    errors.value = errors.value.filter(e => e.id !== id)
    if (selectedError.value?.id === id) closeDetail()
  }
  deletingId.value = null
}

const clearAllResolved = async () => {
  const { error } = await supabase
    .from('system_errors')
    .delete()
    .eq('is_resolved', true)

  if (!error) {
    errors.value = errors.value.filter(e => !e.is_resolved)
  }
}

// ──────────────────────── Helpers ────────────────────────
const formatTime = (ts) => {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

const timeAgo = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'Baru saja'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} mnt lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  return `${Math.floor(hr / 24)} hari lalu`
}

const severityConfig = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  error: {
    label: 'Error',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
  },
  warning: {
    label: 'Warning',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    icon: Info,
    iconColor: 'text-yellow-500',
  },
}

const getSeverity = (sev) => severityConfig[sev] || severityConfig.error

// ──────────────────────── Lifecycle ────────────────────────
let pollInterval
onMounted(() => {
  fetchErrors()
  pollInterval = setInterval(fetchErrors, 15000)
})
onUnmounted(() => clearInterval(pollInterval))
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <!-- ───── Header ───── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900 flex items-center gap-2">
          <AlertTriangle class="text-orange-500" :size="26" />
          Error Monitor
        </h1>
        <p class="mt-1 text-sm text-venus-400">
          Pantau semua error yang terdeteksi di sistem secara real-time. Auto-refresh setiap 15 detik.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="clearAllResolved"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-venus-200 text-sm font-semibold text-venus-500 hover:text-red-600 hover:border-red-200 transition-colors shadow-ios-sm"
        >
          <Trash2 :size="15" />
          Hapus Resolved
        </button>
        <button
          @click="fetchErrors"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-venus-200 text-sm font-semibold text-venus-700 hover:text-primary-600 transition-colors shadow-ios-sm"
        >
          <RefreshCw :size="15" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- ───── Stats Cards ───── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total -->
      <GlassCard class="flex items-center gap-4">
        <div class="w-11 h-11 rounded-xl bg-venus-100 flex items-center justify-center text-venus-500 shrink-0">
          <Shield :size="22" />
        </div>
        <div>
          <p class="text-2xl font-black text-venus-900">{{ stats.total }}</p>
          <p class="text-xs font-medium text-venus-400">Total Error</p>
        </div>
      </GlassCard>
      <!-- Critical -->
      <GlassCard class="flex items-center gap-4">
        <div class="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
          <AlertCircle :size="22" />
        </div>
        <div>
          <p class="text-2xl font-black text-red-600">{{ stats.critical }}</p>
          <p class="text-xs font-medium text-venus-400">Critical</p>
        </div>
      </GlassCard>
      <!-- Unresolved -->
      <GlassCard class="flex items-center gap-4">
        <div class="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
          <Zap :size="22" />
        </div>
        <div>
          <p class="text-2xl font-black text-orange-600">{{ stats.unresolved }}</p>
          <p class="text-xs font-medium text-venus-400">Belum Resolved</p>
        </div>
      </GlassCard>
      <!-- Today -->
      <GlassCard class="flex items-center gap-4">
        <div class="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 shrink-0">
          <Clock :size="22" />
        </div>
        <div>
          <p class="text-2xl font-black text-sky-600">{{ stats.today }}</p>
          <p class="text-xs font-medium text-venus-400">Hari Ini</p>
        </div>
      </GlassCard>
    </div>

    <!-- ───── Scenario Tester Panel (DEV ONLY) ───── -->
    <div v-if="isDev" class="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden">
      <!-- Toggle Header -->
      <button
        @click="showScenarios = !showScenarios"
        class="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-amber-50 transition-colors"
      >
        <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <FlaskConical :size="18" />
        </div>
        <div class="flex-1">
          <p class="font-bold text-amber-800 text-sm">🧪 Scenario Test — Simulasi Error Sistem</p>
          <p class="text-xs text-amber-600 mt-0.5">Trigger error nyata untuk memverifikasi Error Monitor bekerja dengan benar.</p>
        </div>
        <ChevronDown
          :size="18"
          class="text-amber-500 transition-transform duration-300"
          :class="{ 'rotate-180': showScenarios }"
        />
      </button>

      <!-- Scenario List -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[1000px]"
        leave-from-class="opacity-100 max-h-[1000px]"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-if="showScenarios" class="border-t border-amber-200">
          <!-- Actions bar -->
          <div class="flex items-center justify-between px-5 py-3 bg-amber-50 border-b border-amber-100">
            <p class="text-xs text-amber-600 font-medium">8 skenario tersedia — klik ▶ untuk menjalankan. Error akan muncul di daftar bawah dalam ~2 detik.</p>
            <button
              @click="resetScenarios"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
            >
              <RotateCcw :size="12" /> Reset Status
            </button>
          </div>

          <!-- Grid of scenarios -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            <div
              v-for="sc in scenarios"
              :key="sc.id"
              class="bg-white rounded-xl border p-4 flex gap-3 items-start"
              :class="{
                'border-emerald-200 bg-emerald-50/30': scenarioStates[sc.id] === 'done',
                'border-amber-200': !scenarioStates[sc.id] || scenarioStates[sc.id] === 'running',
              }"
            >
              <!-- Left: info -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5 mb-1">
                  <span class="text-[10px] font-black uppercase px-1.5 py-0.5 rounded" :class="sc.badgeColor">{{ sc.badge }}</span>
                  <span
                    class="text-[10px] font-black uppercase px-1.5 py-0.5 rounded"
                    :class="{
                      'bg-red-100 text-red-700': sc.severity === 'critical',
                      'bg-orange-100 text-orange-700': sc.severity === 'error',
                      'bg-yellow-100 text-yellow-700': sc.severity === 'warning',
                    }"
                  >{{ sc.severity }}</span>
                  <!-- Status -->
                  <span v-if="scenarioStates[sc.id] === 'done'" class="text-[10px] font-black text-emerald-600">✓ Terkirim</span>
                  <span v-else-if="scenarioStates[sc.id] === 'running'" class="text-[10px] font-black text-sky-600 animate-pulse">⏳ Running...</span>
                </div>
                <p class="text-sm font-bold text-venus-800 leading-tight mb-1">{{ sc.label }}</p>
                <p class="text-[11px] text-venus-500 leading-relaxed">{{ sc.description }}</p>
              </div>
              <!-- Right: run button -->
              <button
                @click="runScenario(sc)"
                :disabled="scenarioStates[sc.id] === 'running'"
                class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                :class="scenarioStates[sc.id] === 'done'
                  ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50'"
              >
                <CheckCircle2 v-if="scenarioStates[sc.id] === 'done'" :size="18" />
                <Play v-else :size="16" class="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ───── Filters ───── -->
    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Search -->
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" :size="17" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari berdasarkan tipe error, pesan, atau URL..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-venus-200 rounded-xl text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
        />
      </div>

      <!-- Severity Filter -->
      <div class="flex items-center gap-2 overflow-x-auto pb-0.5">
        <button v-for="opt in [
          { val: 'all', label: 'Semua' },
          { val: 'critical', label: '🔴 Critical' },
          { val: 'error', label: '🟠 Error' },
          { val: 'warning', label: '🟡 Warning' },
        ]" :key="opt.val"
          @click="filterSeverity = opt.val"
          class="whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-lg transition-colors border"
          :class="filterSeverity === opt.val
            ? 'bg-venus-800 text-white border-transparent'
            : 'bg-white text-venus-600 border-venus-200 hover:bg-venus-50'"
        >{{ opt.label }}</button>
      </div>

      <!-- Resolved Filter -->
      <div class="flex items-center gap-2">
        <button v-for="opt in [
          { val: 'unresolved', label: 'Aktif' },
          { val: 'resolved', label: 'Resolved' },
          { val: 'all', label: 'Semua' },
        ]" :key="opt.val"
          @click="filterResolved = opt.val"
          class="whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-lg transition-colors border"
          :class="filterResolved === opt.val
            ? (opt.val === 'resolved' ? 'bg-emerald-500 text-white border-transparent' : 'bg-primary-500 text-white border-transparent')
            : 'bg-white text-venus-600 border-venus-200 hover:bg-venus-50'"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- ───── Error List ───── -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <!-- Loading skeleton -->
      <div v-if="loading && errors.length === 0" class="p-6 space-y-3">
        <div v-for="i in 6" :key="i" class="flex gap-4 p-4 border border-venus-100 rounded-xl bg-venus-50/50 animate-pulse">
          <div class="w-10 h-10 bg-venus-200 rounded-xl shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="w-2/5 h-4 bg-venus-200 rounded"></div>
            <div class="w-3/5 h-3 bg-venus-100 rounded"></div>
          </div>
          <div class="w-16 h-4 bg-venus-100 rounded"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredErrors.length === 0" class="p-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-emerald-50 text-emerald-400 flex items-center justify-center rounded-full mb-4">
          <ShieldCheck :size="32" />
        </div>
        <h3 class="text-base font-bold text-venus-700">Tidak Ada Error Terdeteksi</h3>
        <p class="text-sm text-venus-400 mt-1 max-w-xs">Sistem berjalan normal. Semua error yang terjadi akan otomatis tercatat di sini.</p>
      </div>

      <!-- List -->
      <div v-else class="divide-y divide-venus-100">
        <div
          v-for="err in filteredErrors"
          :key="err.id"
          @click="openDetail(err)"
          class="group p-4 sm:px-6 flex gap-4 items-start cursor-pointer hover:bg-venus-50/60 transition-colors relative"
          :class="{ 'opacity-60': err.is_resolved }"
        >
          <!-- Severity icon -->
          <div
            class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            :class="getSeverity(err.severity).bg"
          >
            <component :is="getSeverity(err.severity).icon" :size="20" :class="getSeverity(err.severity).iconColor" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <!-- Error type badge -->
              <span
                class="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border"
                :class="[getSeverity(err.severity).bg, getSeverity(err.severity).text, getSeverity(err.severity).border]"
              >{{ err.severity }}</span>
              <span class="font-bold text-venus-900 text-sm">{{ err.error_type }}</span>
              <!-- Resolved badge -->
              <span v-if="err.is_resolved" class="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                ✓ Resolved
              </span>
              <!-- Note indicator -->
              <span v-if="err.notes" class="text-[10px] font-bold text-indigo-500">📝 Ada catatan</span>
            </div>
            <p class="text-sm text-venus-600 truncate">{{ err.message }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-venus-400">
              <span class="flex items-center gap-1"><User :size="11" /> {{ err.user_name || 'Guest' }} ({{ err.user_role || '-' }})</span>
              <span class="flex items-center gap-1 truncate max-w-[200px]"><Globe :size="11" /> {{ err.url || '-' }}</span>
              <span v-if="err.component" class="flex items-center gap-1"><Code2 :size="11" /> {{ err.component }}</span>
            </div>
          </div>

          <!-- Time + arrow -->
          <div class="hidden sm:flex flex-col items-end gap-1 shrink-0">
            <span class="text-xs font-bold text-sky-600">{{ timeAgo(err.created_at) }}</span>
            <span class="text-[11px] text-venus-400">{{ formatTime(err.created_at) }}</span>
          </div>
          <ChevronRight class="shrink-0 mt-2 text-venus-300 group-hover:text-venus-600 transition-colors" :size="16" />
        </div>
      </div>
    </GlassCard>

    <!-- ───── Detail Modal ───── -->
    <Transition name="modal">
      <div v-if="selectedError" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeDetail"></div>

        <!-- Panel -->
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <!-- Modal Header -->
          <div class="flex items-center gap-4 px-6 py-4 border-b border-venus-100 bg-venus-50/50">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              :class="getSeverity(selectedError.severity).bg"
            >
              <component :is="getSeverity(selectedError.severity).icon" :size="20" :class="getSeverity(selectedError.severity).iconColor" />
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="font-black text-venus-900 text-base truncate">{{ selectedError.error_type }}</h2>
              <p class="text-xs text-venus-400">{{ formatTime(selectedError.created_at) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="toggleResolve(selectedError)"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border"
                :class="selectedError.is_resolved
                  ? 'bg-venus-100 text-venus-600 border-venus-200 hover:bg-red-50 hover:text-red-600'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'"
              >
                <CheckCircle2 :size="13" class="inline mr-1" />
                {{ selectedError.is_resolved ? 'Batalkan Resolved' : 'Tandai Resolved' }}
              </button>
              <button
                @click="deleteError(selectedError.id)"
                :disabled="deletingId === selectedError.id"
                class="p-2 rounded-lg text-venus-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 :size="16" />
              </button>
              <button @click="closeDetail" class="p-2 rounded-lg text-venus-400 hover:text-venus-700 hover:bg-venus-100 transition-colors">
                <X :size="18" />
              </button>
            </div>
          </div>

          <!-- Modal Body -->
          <div class="overflow-y-auto flex-1 p-6 space-y-5">
            <!-- Meta info -->
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-venus-50 rounded-xl p-3 col-span-2">
                <p class="text-[10px] font-black uppercase text-venus-400 mb-1">Pesan Error</p>
                <p class="text-sm font-semibold text-venus-800 break-words">{{ selectedError.message }}</p>
              </div>
              <div class="bg-venus-50 rounded-xl p-3">
                <p class="text-[10px] font-black uppercase text-venus-400 mb-1">Severity</p>
                <span
                  class="text-xs font-black uppercase px-2 py-0.5 rounded-md border"
                  :class="[getSeverity(selectedError.severity).bg, getSeverity(selectedError.severity).text, getSeverity(selectedError.severity).border]"
                >{{ selectedError.severity }}</span>
              </div>
              <div class="bg-venus-50 rounded-xl p-3">
                <p class="text-[10px] font-black uppercase text-venus-400 mb-1">Komponen Vue</p>
                <p class="text-sm font-semibold text-venus-800">{{ selectedError.component || '—' }}</p>
              </div>
              <div class="bg-venus-50 rounded-xl p-3">
                <p class="text-[10px] font-black uppercase text-venus-400 mb-1">User</p>
                <p class="text-sm font-semibold text-venus-800">{{ selectedError.user_name || 'Guest' }}</p>
                <p class="text-[11px] text-venus-400">{{ selectedError.user_role || '-' }}</p>
              </div>
              <div class="bg-venus-50 rounded-xl p-3">
                <p class="text-[10px] font-black uppercase text-venus-400 mb-1">Waktu Terjadi</p>
                <p class="text-sm font-semibold text-venus-800">{{ formatTime(selectedError.created_at) }}</p>
              </div>
              <div class="bg-venus-50 rounded-xl p-3 col-span-2">
                <p class="text-[10px] font-black uppercase text-venus-400 mb-1">URL Halaman</p>
                <p class="text-xs text-sky-600 break-all font-mono">{{ selectedError.url || '—' }}</p>
              </div>
            </div>

            <!-- Stack trace -->
            <div v-if="selectedError.stack">
              <p class="text-[10px] font-black uppercase text-venus-400 mb-2 flex items-center gap-1.5">
                <Code2 :size="12" /> Stack Trace
              </p>
              <pre class="bg-slate-900 text-slate-200 rounded-xl p-4 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words font-mono">{{ selectedError.stack }}</pre>
            </div>

            <!-- Notes -->
            <div>
              <p class="text-[10px] font-black uppercase text-venus-400 mb-2 flex items-center gap-1.5">
                <StickyNote :size="12" /> Catatan Admin
              </p>
              <textarea
                v-model="noteText"
                rows="3"
                placeholder="Tambahkan catatan atau solusi untuk error ini..."
                class="w-full px-4 py-3 border border-venus-200 rounded-xl text-sm resize-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
              ></textarea>
              <div class="flex justify-end mt-2">
                <button
                  @click="saveNote"
                  :disabled="savingNote"
                  class="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors disabled:opacity-60"
                >
                  {{ savingNote ? 'Menyimpan...' : 'Simpan Catatan' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-enter-from .relative {
  transform: translateY(30px) scale(0.97);
}
.modal-leave-to .relative {
  transform: translateY(20px) scale(0.97);
}
</style>
