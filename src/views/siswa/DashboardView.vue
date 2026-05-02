<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  Play,
  Calendar,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
  BookOpen,
  Users,
  Hash
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, EmptyState } from '@/components/ui'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const availableExams = ref([])
const completedExamIds = ref(new Set())
const className = ref('')
const errorMessage = ref('')

const fetchDashboardData = async () => {
  loading.value = true
  errorMessage.value = ''
  
  try {
    const classId = authStore.profile?.kelas_id
    const siswaId = authStore.user?.id

    if (classId) {
      const { data: kelasData } = await supabase
        .from('kelas')
        .select('nama')
        .eq('id', classId)
        .single()
      className.value = kelasData?.nama || 'Belum terdaftar'

      // Fetch ujian aktif + ujian yang sudah dikerjakan siswa ini secara paralel
      const [examsRes, resultsRes] = await Promise.all([
        supabase
          .from('ujian')
          .select('*, mapel(nama), kelas(nama), guru:profiles!ujian_guru_id_fkey(full_name)')
          .eq('kelas_id', classId)
          .eq('status', 'aktif')
          .order('tanggal_mulai', { ascending: true }),
        supabase
          .from('exam_results')
          .select('exam_id, submitted_at')
          .eq('siswa_id', siswaId)
      ])

      if (examsRes.error) {
        errorMessage.value = 'Gagal mengambil data ujian: ' + examsRes.error.message
      } else {
        const examList = examsRes.data || []
        // Fetch jumlah soal per ujian
        if (examList.length > 0) {
          const { data: soalCounts } = await supabase
            .from('ujian_soal')
            .select('ujian_id')
            .in('ujian_id', examList.map(e => e.id))
          const countMap = {}
          ;(soalCounts || []).forEach(r => {
            countMap[r.ujian_id] = (countMap[r.ujian_id] || 0) + 1
          })
          availableExams.value = examList.map(e => ({ ...e, jumlah_soal: countMap[e.id] || 0 }))
        } else {
          availableExams.value = []
        }
      }

      // Simpan exam_id yang sudah dikerjakan (hanya yang submitted_at tidak null)
      completedExamIds.value = new Set((resultsRes.data || []).filter(r => r.submitted_at).map(r => r.exam_id))
    } else {
      className.value = 'Belum terdaftar di kelas'
    }
  } catch (err) {
    console.error('Error fetching dashboard data:', err)
    errorMessage.value = 'Terjadi kesalahan sistem'
  } finally {
    loading.value = false
  }
}

const isCompleted = (examId) => completedExamIds.value.has(examId)

// Jalankan langsung jika profile sudah ada, atau tunggu sampai profile ter-load
onMounted(() => {
  if (authStore.profile) {
    fetchDashboardData()
  }
})

watch(
  () => authStore.profile?.kelas_id,
  (newVal) => {
    if (newVal) fetchDashboardData()
  }
)

const startExam = (id) => {
  router.push(`/siswa/ujian/${id}`)
}

const formatDate = (isoStr) => {
  if (!isoStr) return '—'
  const date = new Date(isoStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }) + ' WIB'
}

const getInitials = (str) => {
  if (!str) return 'U'
  return str.charAt(0).toUpperCase()
}

// Status waktu ujian
const now = ref(new Date())
let clockInterval = null
onUnmounted(() => clearInterval(clockInterval))
onMounted(() => {
  clockInterval = setInterval(() => { now.value = new Date() }, 10000) // update setiap 10 detik
})

const examTimeStatus = (exam) => {
  const mulai = exam.tanggal_mulai ? new Date(exam.tanggal_mulai) : null
  const selesai = exam.tanggal_selesai ? new Date(exam.tanggal_selesai) : null
  const n = now.value

  if (mulai && n < mulai) return 'belum_mulai'
  if (selesai && n > selesai) return 'berakhir'
  return 'berlangsung'
}

const visibleExams = computed(() => {
  // Sembunyikan ujian yang sudah berakhir, tampilkan yg berlangsung & belum mulai
  return availableExams.value.filter(e => examTimeStatus(e) !== 'berakhir')
})

const formatCountdown = (exam) => {
  const mulai = new Date(exam.tanggal_mulai)
  const diff = mulai - now.value
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h} jam ${m} menit lagi`
  return `${m} menit lagi`
}

</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header Area -->
    <div class="flex flex-col justify-between gap-6 md:flex-row md:items-center">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-venus-900">
          <span class="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Halo,</span> 
          {{ authStore.profile?.full_name?.split(' ')[0] || 'Siswa' }} 👋
        </h1>
        <p class="mt-1.5 text-sm font-medium text-venus-500">Pilih ujian yang tersedia untuk Anda kerjakan hari ini.</p>
      </div>
      <div class="flex items-center gap-3 rounded-xl border border-emerald-100/80 bg-emerald-50/90 px-4 py-2.5 shadow-ios-sm">
        <div class="relative flex h-2.5 w-2.5 items-center justify-center">
          <div class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></div>
          <div class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></div>
        </div>
        <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Status Aktif</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <!-- Exam Cards Area -->
      <div class="lg:col-span-2 space-y-6">
        <div class="flex items-center gap-3 border-b border-venus-100 pb-4">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <ClipboardList :size="16" stroke-width="2.5" />
          </div>
          <h3 class="text-sm font-bold uppercase tracking-wider text-venus-800">
            Daftar Ujian Anda
          </h3>
        </div>

        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard v-for="i in 2" :key="'skeleton-'+i" padding="p-8">
            <div class="flex h-full flex-col animate-pulse">
              <div class="mb-6 flex justify-between">
                <div class="h-12 w-12 rounded-2xl bg-venus-100"></div>
                <div class="h-6 w-16 rounded-lg bg-venus-100"></div>
              </div>
              <div class="mb-8 space-y-3">
                <div class="h-6 w-3/4 rounded-md bg-venus-100"></div>
                <div class="flex gap-4">
                  <div class="h-4 w-20 rounded bg-venus-100"></div>
                  <div class="h-4 w-24 rounded bg-venus-100"></div>
                </div>
              </div>
              <div class="mt-auto h-11 w-full rounded-xl bg-venus-100"></div>
            </div>
          </GlassCard>
        </div>

        <div v-else-if="errorMessage">
          <EmptyState 
            title="Terjadi Kesalahan" 
            :description="errorMessage"
          />
        </div>

        <div v-else-if="visibleExams.length === 0">
          <EmptyState 
            title="Tidak Ada Ujian Aktif" 
            description="Saat ini belum ada jadwal ujian yang terbuka untuk kelas Anda." 
          />
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard
            v-for="exam in visibleExams"
            :key="exam.id"
            padding="p-8"
            class="transition-all duration-300"
            :class="[
              isCompleted(exam.id) ? 'opacity-70' :
              examTimeStatus(exam) === 'belum_mulai' ? 'opacity-80 border-blue-100' :
              'group hover:border-primary-200 hover:ring-2 hover:ring-primary-50/50'
            ]"
          >
            <div class="flex h-full flex-col">
              <div class="mb-6 flex items-start justify-between">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold shadow-ios-sm transition-transform duration-300"
                  :class="isCompleted(exam.id)
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-gradient-to-br from-primary-100 to-indigo-50 text-primary-700 group-hover:scale-110'"
                >
                  {{ getInitials(exam.mapel?.nama) }}
                </div>
                <span
                  class="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide shadow-ios-sm"
                  :class="isCompleted(exam.id)
                    ? 'bg-slate-100 text-slate-500'
                    : examTimeStatus(exam) === 'belum_mulai'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'"
                >
                  {{ isCompleted(exam.id) ? 'Selesai' : examTimeStatus(exam) === 'belum_mulai' ? 'Segera' : 'Terbuka' }}
                </span>
              </div>

              <div class="mb-8 space-y-3">
                <h4 class="text-xl font-bold tracking-tight text-venus-900 leading-snug line-clamp-2">
                  {{ exam.nama }}
                </h4>
                <div class="flex flex-col gap-2 text-xs font-semibold text-venus-500">
                  <div class="flex items-center gap-2">
                    <BookOpen :size="13" class="text-indigo-400 shrink-0" />
                    <span class="truncate">{{ exam.mapel?.nama || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <GraduationCap :size="13" class="text-teal-400 shrink-0" />
                    <span class="truncate">{{ exam.guru?.full_name || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Hash :size="13" class="text-orange-400 shrink-0" />
                    <span>{{ exam.jumlah_soal }} soal</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Calendar :size="13" class="text-primary-400 shrink-0" />
                    <span>{{ formatDate(exam.tanggal_mulai) }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <Clock :size="13" class="text-amber-400 shrink-0" />
                    <span>{{ exam.durasi }} menit</span>
                  </div>
                </div>
              </div>

              <!-- Sudah dikerjakan -->
              <div
                v-if="isCompleted(exam.id)"
                class="mt-auto flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed"
              >
                <CheckCircle2 :size="16" class="text-emerald-500" />
                Sudah Dikerjakan
              </div>
              <!-- Belum waktunya -->
              <div
                v-else-if="examTimeStatus(exam) === 'belum_mulai'"
                class="mt-auto flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-blue-100 bg-blue-50 py-3 text-sm font-semibold text-blue-600 cursor-not-allowed select-none"
              >
                <div class="flex items-center gap-1.5">
                  <Clock :size="15" />
                  Ujian Belum Dimulai
                </div>
                <span v-if="formatCountdown(exam)" class="text-[11px] font-bold text-blue-400">
                  Mulai dalam {{ formatCountdown(exam) }}
                </span>
              </div>
              <!-- Belum dikerjakan dan waktu masih berlangsung -->
              <PrimaryButton
                v-else
                @click="startExam(exam.id)"
                class="w-full mt-auto group-hover:bg-primary-700"
              >
                <Play :size="16" class="transition-transform group-hover:translate-x-1" /> Mulai Ujian
              </PrimaryButton>
            </div>
          </GlassCard>
        </div>
      </div>

      <!-- Right Sidebar Area -->
      <div class="space-y-6">
        <!-- Akun Info Card -->
        <GlassCard padding="p-6 mt-20" class="relative overflow-hidden">
          <div class="absolute -right-6 -top-6 text-emerald-500/10">
            <ShieldCheck :size="100" stroke-width="1.5" />
          </div>
          <div class="relative z-10">
            <h4 class="mb-5 flex items-center gap-2 text-sm font-bold text-venus-900 border-b border-venus-100 pb-3">
              <GraduationCap :size="18" class="text-primary-500" />
              Info Siswa
            </h4>
            <div class="space-y-4">
              <div class="flex flex-col gap-1 text-xs">
                <span class="font-medium text-venus-400">Nama Lengkap</span>
                <span class="font-bold text-venus-900">{{ authStore.profile?.full_name || '—' }}</span>
              </div>
              <div class="flex flex-col gap-1 text-xs">
                <span class="font-medium text-venus-400">Kelas</span>
                <span class="font-bold text-primary-700 bg-primary-50 self-start px-2.5 py-1 rounded-md">{{ className }}</span>
              </div>
              <div class="flex flex-col gap-1 text-xs">
                <span class="font-medium text-venus-400">Status Akun</span>
                <span class="font-bold flex items-center gap-1 text-emerald-600">
                  <ShieldCheck :size="13" /> Terverifikasi
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        <!-- Instruction Card -->
        <div class="relative overflow-hidden rounded-2xl border-2 border-amber-500/20 bg-gradient-to-b from-amber-50 to-white p-7 shadow-ios-md">
          <div class="pointer-events-none absolute -bottom-8 -right-8 opacity-10">
            <AlertTriangle :size="140" stroke-width="1.25" class="text-amber-600" />
          </div>
          <h4 class="mb-5 flex items-center gap-2 text-base font-bold text-amber-900">
            <AlertTriangle :size="20" stroke-width="2.5" class="text-amber-500" />
            Aturan Penting
          </h4>
          <ul class="relative z-10 space-y-4">
            <li class="flex gap-3">
              <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-sm">1</div>
              <p class="text-[13px] font-medium leading-relaxed text-amber-800/80">
                <strong class="text-amber-900">Dilarang</strong> berpindah tab browser atau menutup jendela ujian.
              </p>
            </li>
            <li class="flex gap-3">
              <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-sm">2</div>
              <p class="text-[13px] font-medium leading-relaxed text-amber-800/80">
                Ujian <strong class="text-amber-900">otomatis terkirim</strong> jika waktu hitung mundur telah habis.
              </p>
            </li>
            <li class="flex gap-3">
              <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-sm">3</div>
              <p class="text-[13px] font-medium leading-relaxed text-amber-800/80">
                Pastikan <strong class="text-amber-900">koneksi internet stabil</strong> sebelum memulai ujian.
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
