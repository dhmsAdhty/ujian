<script setup>
import { useExamEngine } from '@/composables/useExamEngine'
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Send, 
  AlertTriangle,
  LayoutList,
  CheckCircle2,
  HelpCircle
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton } from '@/components/ui'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'

const route = useRoute()
const router = useRouter()
const { 
  currentQuestion, 
  currentIndex, 
  questions, 
  answers, 
  timer, 
  formatTimer, 
  loading, 
  progress,
  violations,
  nextQuestion, 
  prevQuestion, 
  submitExam 
} = useExamEngine(route.params.id)

const confirmSubmit = async () => {
  const result = await Swal.fire({
    title: 'Selesaikan Ujian?',
    text: "Pastikan semua jawaban telah terisi dengan benar.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4318ff',
    confirmButtonText: 'Ya, Selesai!',
    cancelButtonText: 'Kembali'
  })

  if (result.isConfirmed) {
    await submitExam()
    router.push('/siswa')
  }
}

const selectOption = (optionLabel) => {
  answers.value[currentQuestion.value.id] = optionLabel
}
</script>

<template>
  <div v-if="loading" class="flex min-h-screen items-center justify-center bg-venus-50">
    <div class="space-y-4 text-center">
      <div class="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
      <p class="font-bold text-venus-500 uppercase tracking-widest text-xs">Mempersiapkan Soal...</p>
    </div>
  </div>

  <div v-else class="flex min-h-screen flex-col animate-fade-in bg-venus-50">
    <!-- Exam Header -->
    <header
      class="glass-panel sticky top-0 z-50 flex h-20 items-center justify-between border-b border-venus-200/80 px-6 lg:px-10"
    >
      <div class="flex items-center gap-6">
        <div class="hidden md:flex flex-col">
          <h2 class="font-black text-xl text-venus-900 leading-none">CBT EXAM</h2>
          <span class="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-1">Ujian Tengah Semester</span>
        </div>
        
        <!-- Timer Badge -->
        <div 
          class="flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all shadow-sm"
          :class="timer < 300 ? 'bg-red-50 border-red-100 text-red-600 animate-pulse' : 'bg-white border-venus-200 text-venus-700'"
        >
          <Clock :size="20" />
          <span class="font-black text-lg font-mono">{{ formatTimer }}</span>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="hidden sm:flex flex-col items-end mr-4">
          <p class="text-[9px] font-black text-venus-400 uppercase tracking-widest">Progress</p>
          <p class="text-sm font-bold text-venus-700">{{ currentIndex + 1 }} dari {{ questions.length }} Soal</p>
        </div>
        <PrimaryButton @click="confirmSubmit" class="!py-2.5 shadow-lg shadow-primary-500/20">
          <Send :size="18" />
          Akhiri Ujian
        </PrimaryButton>
      </div>
    </header>

    <!-- Progress Bar -->
    <div class="w-full h-1 bg-venus-100 relative">
      <div 
        class="h-full bg-primary-500 transition-all duration-500 ease-ios shadow-[0_0_12px_rgb(11_110_253_/_0.35)]"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col p-4 lg:p-10 max-w-6xl mx-auto w-full gap-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        <!-- Question Content -->
        <div class="lg:col-span-2 space-y-6">
          <GlassCard padding="p-8 lg:p-12" class="h-full flex flex-col shadow-2xl relative overflow-hidden">
            <!-- Question Decoration -->
            <div class="absolute -top-10 -left-10 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl"></div>
            
            <div class="flex items-center gap-3 mb-8">
              <span class="w-12 h-12 bg-primary-500 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary-500/20">
                {{ currentIndex + 1 }}
              </span>
              <div class="h-px w-12 bg-venus-100"></div>
              <span class="text-xs font-bold text-venus-400 uppercase tracking-widest">Pertanyaan</span>
            </div>

            <!-- Media -->
            <div
              v-if="currentQuestion.media_url"
              class="mb-8 overflow-hidden rounded-3xl border border-venus-200/80 shadow-ios-sm"
            >
              <img :src="currentQuestion.media_url" class="w-full h-auto max-h-[400px] object-contain bg-white" />
            </div>

            <div class="flex-1">
              <h3 class="text-xl lg:text-2xl font-bold text-venus-800 leading-relaxed mb-10">
                {{ currentQuestion.konten }}
              </h3>

              <!-- Options Grid (Pilihan Ganda) -->
              <div v-if="currentQuestion.tipe_soal === 'pilihan_ganda'" class="grid grid-cols-1 gap-4">
                <button 
                  v-for="opt in currentQuestion.options" 
                  :key="opt.label"
                  @click="selectOption(opt.label)"
                  class="flex items-center gap-5 rounded-2xl border-2 p-5 text-left transition-[border-color,background-color,box-shadow] duration-250 ease-ios active:scale-[0.99]"
                  :class="answers[currentQuestion.id] === opt.label 
                    ? 'border-primary-500 bg-primary-50 shadow-ios-md shadow-primary-500/10' 
                    : 'border-venus-100 bg-white focus-visible:border-primary-300 focus-visible:outline-none'"
                >
                  <div 
                    class="flex h-10 w-10 items-center justify-center rounded-xl font-bold transition-transform duration-200 ease-ios active:scale-95"
                    :class="answers[currentQuestion.id] === opt.label 
                      ? 'bg-primary-600 text-white shadow-ios-sm' 
                      : 'bg-venus-100 text-venus-500'"
                  >
                    {{ opt.label }}
                  </div>
                  <span class="font-bold text-venus-700 tracking-tight">{{ opt.text }}</span>
                  <div v-if="answers[currentQuestion.id] === opt.label" class="ml-auto">
                    <CheckCircle2 :size="22" class="text-primary-500" />
                  </div>
                </button>
              </div>

              <!-- Essay Mode -->
              <div v-else class="space-y-4">
                <label class="text-sm font-bold text-venus-400 uppercase tracking-widest ml-1">Tulis jawaban Anda di bawah ini:</label>
                <textarea 
                  v-model="answers[currentQuestion.id]"
                  rows="10"
                  class="form-input !text-lg !p-6 !bg-venus-50/50"
                  placeholder="Ketik jawaban Anda secara lengkap..."
                ></textarea>
              </div>
            </div>
          </GlassCard>
        </div>

        <!-- Sidebar: Navigator & Stats -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Question Navigator -->
          <GlassCard padding="p-8">
            <h3 class="font-bold text-venus-800 uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <LayoutList :size="16" class="text-venus-400" />
              Navigasi Soal
            </h3>
            <div class="grid grid-cols-5 gap-3">
              <button 
                v-for="(soal, i) in questions" 
                :key="soal.id"
                @click="currentIndex = i"
                class="flex aspect-square w-full items-center justify-center rounded-xl border-2 text-xs font-bold transition-[transform,border-color,background-color,color] duration-200 ease-ios active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                :class="[
                  currentIndex === i ? 'border-primary-600 bg-primary-600 text-white shadow-ios-md shadow-primary-500/25' : 
                  answers[soal.id] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 
                  'border-venus-100 bg-white text-venus-400'
                ]"
              >
                {{ i + 1 }}
              </button>
            </div>
          </GlassCard>

          <!-- Security Alert / Rules -->
          <div
            class="relative overflow-hidden rounded-2xl border border-venus-800/90 bg-gradient-to-br from-venus-900 to-venus-800 p-8 text-white shadow-ios-lg"
          >
            <div class="pointer-events-none absolute -bottom-4 -right-4 opacity-[0.08]">
              <AlertTriangle :size="120" stroke-width="1.25" />
            </div>
            <div class="flex items-center gap-2 mb-4">
              <AlertTriangle class="text-primary-500" :size="20" />
              <h4 class="font-bold text-sm tracking-tight">Protokol Keamanan</h4>
            </div>
            <p class="text-xs leading-relaxed text-venus-300 mb-6 font-medium">
              Sistem mencatat setiap perpindahan tab atau layar. Pelanggaran kedua akan mengakhiri ujian secara otomatis.
            </p>
            <div class="p-3 bg-white/5 rounded-xl border border-white/10">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-black uppercase tracking-widest text-venus-400">Total Pelanggaran</span>
                <span class="font-black text-lg" :class="violations > 0 ? 'text-red-500' : 'text-emerald-500'">{{ violations }} / 1</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <GlassCard padding="p-4" class="bg-primary-50/50 border-primary-100">
            <div class="flex gap-3">
              <button 
                @click="prevQuestion"
                :disabled="currentIndex === 0"
                class="pressable-soft flex flex-1 items-center justify-center gap-2 rounded-xl border border-venus-200/90 bg-white py-3 text-sm font-semibold text-venus-600 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100 disabled:opacity-40 disabled:active:scale-100"
              >
                <ChevronLeft :size="18" /> Kembali
              </button>
              <button 
                @click="nextQuestion"
                :disabled="currentIndex === questions.length - 1"
                class="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-ios-md transition-[background-color,transform] duration-200 ease-ios active:bg-primary-700 disabled:opacity-40 disabled:active:scale-100"
              >
                Lajut <ChevronRight :size="18" />
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  </div>
</template>
