<script setup>
import { 
  ClipboardList, 
  Clock, 
  ChevronRight, 
  HelpCircle,
  AlertTriangle,
  Play
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton } from '@/components/ui'
import { useRouter } from 'vue-router'

const router = useRouter()

const availableExams = [
  { 
    id: 'ex-1', 
    title: 'Matematika Wajib - UTS Ganjil', 
    subject: 'Matematika', 
    duration: '90 Menit', 
    questions: 40, 
    status: 'tersedia' 
  },
  { 
    id: 'ex-2', 
    title: 'Fisika Dasar - Latihan Mandiri', 
    subject: 'Fisika', 
    duration: '60 Menit', 
    questions: 25, 
    status: 'tersedia' 
  }
]

const startExam = (id) => {
  router.push(`/siswa/ujian/${id}`)
}
</script>

<template>
  <div class="space-y-8 animate-fade-in-up">
    <!-- Header Area -->
    <div class="flex flex-col justify-between gap-6 md:flex-row md:items-center">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-venus-900">Halo, selamat datang</h1>
        <p class="mt-1 text-sm text-venus-500">Pilih ujian yang ingin Anda kerjakan.</p>
      </div>
      <div class="flex items-center gap-3 rounded-2xl border border-emerald-100/80 bg-emerald-50/90 px-4 py-2.5 shadow-ios-sm">
        <div class="h-2 w-2 rounded-full bg-emerald-500" />
        <span class="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Sesi aktif</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Exam Cards -->
      <div class="lg:col-span-2 space-y-6">
        <h3 class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-venus-400">
          <ClipboardList :size="16" stroke-width="2" />
          Daftar ujian tersedia
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard
            v-for="exam in availableExams"
            :key="exam.id"
            padding="p-8"
          >
            <div class="flex h-full flex-col">
              <div class="mb-6 flex items-start justify-between">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-base font-semibold text-primary-700 shadow-ios-sm"
                >
                  {{ exam.subject.charAt(0) }}
                </div>
                <span
                  class="rounded-lg bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800"
                  >Terbuka</span
                >
              </div>

              <div class="mb-8 space-y-2">
                <h4 class="text-xl font-semibold tracking-tight text-venus-900">{{ exam.title }}</h4>
                <div class="flex items-center gap-4 text-xs font-medium text-venus-500">
                  <div class="flex items-center gap-1.5">
                    <Clock :size="14" /> {{ exam.duration }}
                  </div>
                  <div class="flex items-center gap-1.5">
                    <HelpCircle :size="14" /> {{ exam.questions }} Soal
                  </div>
                </div>
              </div>

              <PrimaryButton @click="startExam(exam.id)" class="w-full">
                <Play :size="16" /> Mulai Ujian
              </PrimaryButton>
            </div>
          </GlassCard>
        </div>
      </div>

      <!-- Instruction Sidebar -->
      <div class="space-y-6">
        <div
          class="relative overflow-hidden rounded-2xl border border-venus-800/90 bg-venus-900 p-8 text-white shadow-ios-lg"
        >
          <div class="pointer-events-none absolute -bottom-4 -right-4 opacity-[0.08]">
            <AlertTriangle :size="120" stroke-width="1.25" />
          </div>
          <h4 class="mb-4 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle class="text-primary-400" :size="20" stroke-width="2" />
            Aturan penting
          </h4>
          <ul class="relative z-10 space-y-4">
            <li class="flex gap-3">
              <div
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold"
              >
                1
              </div>
              <p class="text-xs leading-relaxed text-venus-300">
                Dilarang berpindah tab browser atau menutup jendela ujian.
              </p>
            </li>
            <li class="flex gap-3">
              <div
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold"
              >
                2
              </div>
              <p class="text-xs leading-relaxed text-venus-300">
                Ujian otomatis terkirim jika waktu hitung mundur habis.
              </p>
            </li>
            <li class="flex gap-3">
              <div
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold"
              >
                3
              </div>
              <p class="text-xs leading-relaxed text-venus-300">
                Pastikan koneksi internet stabil sebelum menekan tombol mulai.
              </p>
            </li>
          </ul>
        </div>

        <GlassCard padding="p-6">
          <h4 class="mb-4 text-sm font-semibold text-venus-900">Informasi akun</h4>
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-venus-500">Status</span>
              <span class="font-semibold text-emerald-600">Terverifikasi</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-venus-500">Kelas</span>
              <span class="font-semibold text-venus-800">XII MIPA 2</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
</template>
