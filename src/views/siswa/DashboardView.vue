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
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Halo, Selamat Datang!</h1>
        <p class="text-slate-500 mt-1">Silakan pilih ujian yang ingin Anda kerjakan hari ini.</p>
      </div>
      <div class="flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <span class="text-xs font-bold text-emerald-700 uppercase tracking-widest">Sesi Aktif Terdeteksi</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Exam Cards -->
      <div class="lg:col-span-2 space-y-6">
        <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ClipboardList :size="16" />
          Daftar Ujian Tersedia
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard 
            v-for="exam in availableExams" 
            :key="exam.id"
            class="group hover:scale-[1.02]"
            padding="p-8"
          >
            <div class="flex flex-col h-full">
              <div class="flex items-start justify-between mb-6">
                <div class="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center font-bold shadow-sm">
                   {{ exam.subject.charAt(0) }}
                </div>
                <span class="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-wider">Terbuka</span>
              </div>

              <div class="space-y-2 mb-8">
                <h4 class="text-xl font-bold text-slate-800 tracking-tight group-hover:text-primary-600 transition-colors">{{ exam.title }}</h4>
                <div class="flex items-center gap-4 text-xs font-medium text-slate-400">
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
        <div class="glass-card bg-slate-900 p-8 text-white relative overflow-hidden group">
          <div class="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <AlertTriangle :size="120" />
          </div>
          <h4 class="font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle class="text-primary-500" :size="20" />
            Aturan Penting
          </h4>
          <ul class="space-y-4 relative z-10">
            <li class="flex gap-3">
              <div class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
              <p class="text-xs text-slate-300 leading-relaxed">Dilarang berpindah tab browser atau menutup jendela ujian.</p>
            </li>
            <li class="flex gap-3">
              <div class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
              <p class="text-xs text-slate-300 leading-relaxed">Ujian otomatis terkirim jika waktu hitung mundur habis.</p>
            </li>
            <li class="flex gap-3">
              <div class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
              <p class="text-xs text-slate-300 leading-relaxed">Pastikan koneksi internet stabil sebelum menekan tombol mulai.</p>
            </li>
          </ul>
        </div>

        <GlassCard padding="p-6">
          <h4 class="font-bold text-slate-800 text-sm mb-4">Informasi Akun</h4>
          <div class="space-y-3">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-400 font-medium">Status</span>
              <span class="text-emerald-600 font-bold">Terverifikasi</span>
            </div>
             <div class="flex justify-between items-center text-xs">
              <span class="text-slate-400 font-medium">Kelas</span>
              <span class="text-slate-700 font-bold">XII MIPA 2</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
</template>
