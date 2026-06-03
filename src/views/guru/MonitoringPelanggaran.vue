<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { Search, ShieldAlert, RotateCcw, User, BookOpen, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import { GlassCard, PrimaryButton, EmptyState, AppSelect } from '@/components/ui'
import Swal from 'sweetalert2'

const authStore = useAuthStore()
const loading = ref(true)
const results = ref([])
const exams = ref([])
const selectedExam = ref('')
const searchQuery = ref('')

// Fetch list of exams belonging to this teacher
const fetchExams = async () => {
  const { data } = await supabase
    .from('ujian')
    .select('id, nama, mapel(nama), kelas(nama)')
    .eq('guru_id', authStore.user.id)
    .order('tanggal_mulai', { ascending: false })
  exams.value = data || []
}

// Fetch violation logs / results
const fetchResults = async () => {
  loading.value = true
  
  let query = supabase
    .from('exam_results')
    .select('*, profiles!exam_results_siswa_id_fkey(full_name, email), ujian(nama, mapel(nama), kelas(nama))')
    .order('violations', { ascending: false })

  // Filter based on teacher's exams
  if (selectedExam.value) {
    query = query.eq('exam_id', selectedExam.value)
  } else if (exams.value.length > 0) {
    query = query.in('exam_id', exams.value.map(e => e.id))
  } else {
    // Jika guru tidak punya ujian, jangan tampilkan data apa pun
    results.value = []
    loading.value = false
    return
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching monitoring data:', error)
  } else {
    // Deduplikasi: jika ada >1 baris untuk siswa yang sama pada ujian yang sama
    // (race condition saat submit), ambil yang violations-nya paling tinggi
    const bestMap = new Map()
    ;(data || []).forEach(r => {
      const key = `${r.siswa_id}__${r.exam_id}`
      const existing = bestMap.get(key)
      if (!existing) {
        bestMap.set(key, r)
      } else {
        // Pilih baris dengan violations lebih tinggi
        if ((r.violations || 0) > (existing.violations || 0)) {
          bestMap.set(key, r)
        }
      }
    })
    results.value = Array.from(bestMap.values())
  }
  loading.value = false
}

const filteredResults = computed(() => {
  let data = results.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    data = data.filter(r => r.profiles?.full_name?.toLowerCase().includes(q))
  }
  return data
})

const stats = computed(() => {
  const totalViolations = results.value.reduce((acc, r) => acc + (r.violations || 0), 0)
  const studentsWithViolations = results.value.filter(r => (r.violations || 0) > 0).length
  return { totalViolations, studentsWithViolations }
})

const resetViolation = async (res) => {
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

  // Hapus SEMUA baris duplikat untuk siswa + ujian ini (bukan hanya by id)
  // agar race condition yang menghasilkan duplikat ikut terbersihkan
  const { error: delErr } = await supabase
    .from('exam_results')
    .delete()
    .eq('siswa_id', res.siswa_id)
    .eq('exam_id', res.exam_id)

  if (delErr) {
    // Fallback: coba reset (update) baris ini saja jika delete gagal
    const { error: updErr } = await supabase.from('exam_results')
      .update({ answers: {}, pg_score: null, essay_score: null, submitted_at: null, violations: 0 })
      .eq('id', res.id)
    if (updErr) return Swal.fire('Gagal', updErr.message, 'error')
  }

  Swal.fire({ icon: 'success', title: 'Jawaban direset', timer: 1200, showConfirmButton: false })
  fetchResults()
}

const getAnsweredCount = (answers) => {
  if (!answers) return 0
  return Object.keys(answers).length
}

onMounted(async () => {
  await fetchExams()
  await fetchResults()
})
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-venus-900 tracking-tight flex items-center gap-2">
          <ShieldAlert class="text-primary-600" />
          Monitoring Pelanggaran
        </h1>
        <p class="text-sm text-venus-500 mt-0.5">Pantau integritas siswa dan progres pengerjaan soal secara real-time.</p>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <GlassCard padding="p-5" class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <ShieldAlert :size="24" />
        </div>
        <div>
          <p class="text-xs text-venus-400 font-bold uppercase tracking-widest">Total Pelanggaran</p>
          <p class="text-2xl font-semibold text-venus-900">{{ stats.totalViolations }}</p>
        </div>
      </GlassCard>
      <GlassCard padding="p-5" class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
          <User :size="24" />
        </div>
        <div>
          <p class="text-xs text-venus-400 font-bold uppercase tracking-widest">Siswa Bermasalah</p>
          <p class="text-2xl font-semibold text-venus-900">{{ stats.studentsWithViolations }}</p>
        </div>
      </GlassCard>
    </div>

    <!-- Filters -->
    <GlassCard padding="p-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" :size="16" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Cari nama siswa..." 
            class="form-input pl-9 text-sm w-full" 
          />
        </div>
        <AppSelect
          v-model="selectedExam"
          placeholder="Semua Ujian"
          :options="exams.map(e => ({ value: e.id, label: `${e.nama} (${e.mapel?.nama})` }))"
          class="sm:w-80"
          @update:modelValue="fetchResults"
        />
      </div>
    </GlassCard>

    <!-- Table / Card -->
    <GlassCard padding="p-0" class="overflow-hidden">

      <!-- ===================== MOBILE CARD LIST (< md) ===================== -->
      <template v-if="!loading">
        <div v-if="filteredResults.length === 0" class="md:hidden py-4">
          <EmptyState title="Tidak Ada Data" description="Belum ada data pengerjaan untuk filter ini." />
        </div>
        <div v-else class="divide-y divide-venus-50 md:hidden">
          <div
            v-for="res in filteredResults"
            :key="res.id"
            class="px-4 py-4 hover:bg-venus-50/40 transition-colors"
          >
            <div class="flex items-start gap-3">
              <!-- Avatar -->
              <div class="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold shrink-0">
                {{ res.profiles?.full_name?.charAt(0) || '?' }}
              </div>
              <!-- Info -->
              <div class="min-w-0 flex-1">
                <p class="font-medium text-venus-900 text-sm truncate">{{ res.profiles?.full_name || '—' }}</p>
                <p class="text-[11px] text-venus-400 truncate">{{ res.profiles?.email || '—' }}</p>
                <p class="text-xs text-venus-500 mt-0.5 truncate">{{ res.ujian?.nama || '—' }} · {{ res.ujian?.mapel?.nama }} · {{ res.ujian?.kelas?.nama }}</p>
                <!-- Badges -->
                <div class="flex flex-wrap items-center gap-2 mt-2">
                  <!-- Pelanggaran -->
                  <div
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs"
                    :class="res.violations > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'"
                  >
                    <AlertCircle v-if="res.violations > 0" :size="11" />
                    <CheckCircle2 v-else :size="11" />
                    {{ res.violations || 0 }}x pelanggaran
                  </div>
                  <!-- Progres -->
                  <div class="flex items-center gap-1.5">
                    <div class="w-16 h-1.5 bg-venus-100 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-primary-500 transition-all duration-500"
                        :style="{ width: `${(getAnsweredCount(res.answers) / res.total_soal) * 100}%` }"
                      ></div>
                    </div>
                    <span class="text-[10px] font-semibold text-venus-600">
                      {{ getAnsweredCount(res.answers) }}/{{ res.total_soal }}
                    </span>
                  </div>
                </div>
              </div>
              <!-- Aksi -->
              <button
                @click="resetViolation(res)"
                class="inline-flex shrink-0 items-center gap-1 px-2.5 py-1.5 rounded-lg border border-venus-200 bg-white text-xs font-medium text-venus-600 hover:bg-venus-50 hover:text-primary-600 transition-colors shadow-sm"
                title="Reset Jawaban"
              >
                <RotateCcw :size="13" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Loading skeleton (mobile) -->
      <div v-if="loading" class="md:hidden divide-y divide-venus-50">
        <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-4 py-4">
          <div class="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-venus-100" />
          <div class="flex-1 space-y-2">
            <div class="h-3.5 animate-pulse rounded-full bg-venus-100" />
            <div class="h-3 w-2/3 animate-pulse rounded-full bg-venus-100" />
          </div>
        </div>
      </div>

      <!-- ===================== DESKTOP TABLE (md+) ===================== -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-venus-100 bg-venus-50/60">
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Siswa</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400">Ujian & Mapel</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-center">Pelanggaran</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-center">Progres Soal</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-venus-400 text-right">Aksi</th>
            </tr>
          </thead>

          <!-- Loading -->
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-venus-50">
              <td v-for="j in 5" :key="j" class="px-6 py-4">
                <div class="h-4 bg-venus-100 rounded animate-pulse"></div>
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="filteredResults.length === 0">
            <tr>
              <td colspan="5">
                <EmptyState
                  title="Tidak Ada Data"
                  description="Belum ada data pengerjaan untuk filter ini."
                />
              </td>
            </tr>
          </tbody>

          <!-- Data -->
          <tbody v-else class="divide-y divide-venus-50">
            <tr v-for="res in filteredResults" :key="res.id" class="hover:bg-venus-50/40 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                    {{ res.profiles?.full_name?.charAt(0) || '?' }}
                  </div>
                  <div>
                    <p class="font-medium text-venus-900">{{ res.profiles?.full_name || '—' }}</p>
                    <p class="text-[11px] text-venus-400">{{ res.profiles?.email || '—' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 mb-1">
                  <BookOpen :size="14" class="text-venus-400" />
                  <span class="font-medium text-venus-700">{{ res.ujian?.nama || '—' }}</span>
                </div>
                <p class="text-[11px] text-venus-400 ml-5">{{ res.ujian?.mapel?.nama }} · {{ res.ujian?.kelas?.nama }}</p>
              </td>
              <td class="px-6 py-4 text-center">
                <div
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs"
                  :class="res.violations > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'"
                >
                  <AlertCircle v-if="res.violations > 0" :size="12" />
                  <CheckCircle2 v-else :size="12" />
                  {{ res.violations || 0 }}x
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col items-center">
                  <div class="w-full max-w-[120px] h-1.5 bg-venus-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      class="h-full bg-primary-500 transition-all duration-500"
                      :style="{ width: `${(getAnsweredCount(res.answers) / res.total_soal) * 100}%` }"
                    ></div>
                  </div>
                  <span class="text-[11px] font-semibold text-venus-600">
                    {{ getAnsweredCount(res.answers) }} / {{ res.total_soal }} Soal
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  @click="resetViolation(res)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-venus-200 bg-white text-xs font-medium text-venus-600 hover:bg-venus-50 hover:text-primary-600 transition-colors shadow-sm"
                  title="Reset Jawaban"
                >
                  <RotateCcw :size="14" />
                  Reset
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>
  </div>
</template>
