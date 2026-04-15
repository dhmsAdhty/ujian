<script setup>
import { useExamEngine } from '@/composables/useExamEngine'
import { ChevronLeft, ChevronRight, Clock, Send, AlertTriangle, LayoutList, CheckCircle2 } from 'lucide-vue-next'
import { GlassCard, PrimaryButton } from '@/components/ui'
import { useRoute, useRouter } from 'vue-router'
import { onMounted, onUnmounted, ref } from 'vue'
import Swal from 'sweetalert2'

const examDone = ref(false)

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
  examInfo,
  nextQuestion,
  prevQuestion,
  submitExam
} = useExamEngine(route.params.id, {
  onViolationSubmit: () => {
    examDone.value = true
    exitFullscreen()
    router.replace('/siswa')
  },
  onTimerEnd: () => {
    examDone.value = true
    exitFullscreen()
    router.replace('/siswa')
  }
})

// Fullscreen
function enterFullscreen() {
  const el = document.documentElement
  if (el.requestFullscreen) el.requestFullscreen()
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
}

function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen()
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
}

// Blokir tombol back browser selama ujian berlangsung
// dengan menambahkan state dummy ke history, lalu intercept popstate
function blockBackButton() {
  history.pushState(null, '', location.href)
  window.addEventListener('popstate', handlePopState)
}

function handlePopState() {
  if (examDone.value) return
  // Dorong balik state dummy agar browser tidak bisa mundur
  history.pushState(null, '', location.href)
  Swal.fire({
    icon: 'warning',
    title: 'Ujian Sedang Berlangsung',
    text: 'Anda tidak dapat keluar dari halaman ujian sebelum menyelesaikannya.',
    confirmButtonColor: '#4318ff',
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false
  })
}

onMounted(() => {
  enterFullscreen()
  blockBackButton()
})

onUnmounted(() => {
  exitFullscreen()
  window.removeEventListener('popstate', handlePopState)
})

const confirmSubmit = async () => {
  const unanswered = questions.value.filter(q => {
    const ans = answers.value[q.id]
    if (q.tipe_soal === 'pilihan_ganda_kompleks') return !ans || (Array.isArray(ans) && ans.length === 0)
    return !ans
  }).length

  if (unanswered > 0) {
    const result = await Swal.fire({
      title: 'Ada Soal Belum Dijawab',
      html: `Masih ada <strong>${unanswered} soal</strong> yang belum dijawab.<br>Yakin ingin mengumpulkan?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4318ff',
      confirmButtonText: 'Ya, Kumpulkan',
      cancelButtonText: 'Kembali'
    })
    if (!result.isConfirmed) return
  } else {
    const result = await Swal.fire({
      title: 'Kumpulkan Jawaban?',
      text: 'Semua soal telah dijawab. Pastikan jawaban Anda sudah benar.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4318ff',
      confirmButtonText: 'Ya, Kumpulkan',
      cancelButtonText: 'Kembali'
    })
    if (!result.isConfirmed) return
  }

  const success = await submitExam()
  if (success) {
    examDone.value = true
    exitFullscreen()
    router.replace('/siswa')
  }
}

const selectOption = (optionLabel) => {
  if (!currentQuestion.value) return
  const id = currentQuestion.value.id
  if (currentQuestion.value.tipe_soal === 'pilihan_ganda_kompleks') {
    // Multi-select: toggle label dalam array
    const current = Array.isArray(answers.value[id]) ? [...answers.value[id]] : []
    const idx = current.indexOf(optionLabel)
    if (idx === -1) current.push(optionLabel)
    else current.splice(idx, 1)
    answers.value[id] = current.length > 0 ? current : undefined
  } else {
    answers.value[id] = optionLabel
  }
}

const isSelectedKompleks = (optionLabel) => {
  if (!currentQuestion.value) return false
  const val = answers.value[currentQuestion.value.id]
  return Array.isArray(val) && val.includes(optionLabel)
}

const isLastQuestion = () => currentIndex.value === questions.value.length - 1
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="flex min-h-screen items-center justify-center bg-slate-50">
    <div class="text-center space-y-3">
      <div class="w-10 h-10 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-400 tracking-widest uppercase">Mempersiapkan soal...</p>
    </div>
  </div>

  <div v-else class="flex flex-col h-screen bg-slate-50 overflow-hidden animate-fade-in">

    <!-- Header -->
    <header class="shrink-0 bg-white border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center justify-between gap-4 z-50">
      <!-- Left: Exam info -->
      <div class="flex items-center gap-3 min-w-0">
        <div class="hidden sm:block">
          <p class="text-sm font-semibold text-slate-800 truncate max-w-[200px]">{{ examInfo.nama || 'Ujian' }}</p>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-[10px] text-slate-400">{{ examInfo.kelas }}</span>
            <span class="text-slate-200">·</span>
            <span class="text-[10px] text-slate-400">{{ examInfo.mapel }}</span>
            <span class="text-slate-200">·</span>
            <span class="text-[10px] text-slate-400">{{ examInfo.totalSoal }} soal</span>
          </div>
        </div>
        <!-- Mobile: just show soal count -->
        <span class="sm:hidden text-sm font-medium text-slate-700">{{ examInfo.totalSoal }} Soal</span>
      </div>

      <!-- Center: Timer -->
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-medium transition-colors"
        :class="timer < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-700'"
      >
        <Clock :size="14" />
        {{ formatTimer }}
      </div>

      <!-- Right: Submit -->
      <button
        @click="confirmSubmit"
        class="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-primary-600 text-white text-xs sm:text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        <Send :size="14" />
        <span class="hidden sm:inline">Akhiri Ujian</span>
        <span class="sm:hidden">Akhiri</span>
      </button>
    </header>

    <!-- Progress bar -->
    <div class="shrink-0 h-0.5 bg-slate-100">
      <div
        class="h-full bg-primary-500 transition-all duration-500"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-hidden flex flex-col lg:flex-row">

      <!-- Question area -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div class="max-w-2xl mx-auto space-y-6">

          <!-- Question number + text -->
          <div v-if="currentQuestion" class="bg-white rounded-2xl border border-slate-100 p-5 sm:p-7 shadow-sm">
            <div class="flex items-center gap-2 mb-5">
              <span class="w-7 h-7 rounded-lg bg-primary-600 text-white text-xs font-semibold flex items-center justify-center">
                {{ currentIndex + 1 }}
              </span>
              <span class="text-xs text-slate-400">dari {{ questions.length }} soal</span>
            </div>

            <!-- Media -->
            <div v-if="currentQuestion.media_url" class="mb-5 rounded-xl overflow-hidden border border-slate-100">
              <img :src="currentQuestion.media_url" class="w-full h-auto max-h-72 object-contain bg-white" />
            </div>

            <p class="text-base sm:text-lg text-slate-800 leading-relaxed">
              {{ currentQuestion.konten }}
            </p>
          </div>

          <!-- Options: Pilihan Ganda Biasa -->
          <div v-if="currentQuestion?.tipe_soal === 'pilihan_ganda'" class="space-y-2.5">
            <button
              v-for="opt in currentQuestion.options"
              :key="opt.label"
              @click="selectOption(opt.label)"
              class="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all duration-150"
              :class="answers[currentQuestion.id] === opt.label
                ? 'border-primary-400 bg-primary-50 text-primary-800'
                : 'border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50'"
            >
              <span
                class="w-8 h-8 shrink-0 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors"
                :class="answers[currentQuestion.id] === opt.label
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-500'"
              >{{ opt.label }}</span>
              <span class="text-sm flex-1">{{ opt.text }}</span>
              <CheckCircle2
                v-if="answers[currentQuestion.id] === opt.label"
                :size="16"
                class="text-primary-500 shrink-0"
              />
            </button>
          </div>

          <!-- Options: Pilihan Ganda Kompleks (multi-select) -->
          <div v-else-if="currentQuestion?.tipe_soal === 'pilihan_ganda_kompleks'" class="space-y-2.5">
            <p class="text-[11px] text-purple-500 font-semibold px-1 mb-1">Pilih semua jawaban yang benar (bisa lebih dari 1)</p>
            <button
              v-for="opt in currentQuestion.options"
              :key="opt.label"
              @click="selectOption(opt.label)"
              class="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all duration-150"
              :class="isSelectedKompleks(opt.label)
                ? 'border-purple-400 bg-purple-50 text-purple-800'
                : 'border-slate-100 bg-white text-slate-700 hover:border-purple-200 hover:bg-purple-50/40'"
            >
              <!-- Checkbox indicator -->
              <span
                class="w-8 h-8 shrink-0 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors border-2"
                :class="isSelectedKompleks(opt.label)
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-white border-slate-200 text-slate-500'"
              >
                <CheckCircle2 v-if="isSelectedKompleks(opt.label)" :size="16" />
                <span v-else>{{ opt.label }}</span>
              </span>
              <span class="text-sm flex-1">{{ opt.text }}</span>
            </button>
          </div>

          <!-- Essay -->
          <div v-else-if="currentQuestion?.tipe_soal === 'essay'" class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <label class="text-xs text-slate-400 uppercase tracking-widest block mb-3">Jawaban Anda</label>
            <textarea
              v-model="answers[currentQuestion.id]"
              rows="8"
              class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition"
              placeholder="Tulis jawaban Anda di sini..."
            ></textarea>
          </div>

          <!-- Nav buttons (bottom, mobile-friendly) -->
          <div class="flex gap-3 pb-4">
            <button
              @click="prevQuestion"
              :disabled="currentIndex === 0"
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft :size="16" /> Sebelumnya
            </button>

            <!-- Last question: show Kumpulkan -->
            <button
              v-if="isLastQuestion()"
              @click="confirmSubmit"
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Send :size="16" /> Kumpulkan
            </button>
            <!-- Not last: show Lanjut -->
            <button
              v-else
              @click="nextQuestion"
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Lanjut <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </main>

      <!-- Sidebar (desktop) / Bottom sheet (mobile hidden for now) -->
      <aside class="hidden lg:flex flex-col w-72 shrink-0 border-l border-slate-100 bg-white overflow-y-auto p-5 gap-5">

        <!-- Navigator -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <LayoutList :size="14" class="text-slate-400" />
            <span class="text-xs text-slate-400 uppercase tracking-widest">Navigasi Soal</span>
          </div>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="(soal, i) in questions"
              :key="soal.id"
              @click="currentIndex = i"
              class="aspect-square w-full flex items-center justify-center rounded-lg text-xs font-medium transition-all"
              :class="[
                currentIndex === i
                  ? 'bg-primary-600 text-white shadow-sm'
                  : (Array.isArray(answers[soal.id]) ? answers[soal.id].length > 0 : !!answers[soal.id])
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
              ]"
            >
              {{ i + 1 }}
            </button>
          </div>
          <!-- Legend -->
          <div class="flex items-center gap-3 mt-3">
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-200"></div>
              <span class="text-[10px] text-slate-400">Dijawab</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-200"></div>
              <span class="text-[10px] text-slate-400">Belum</span>
            </div>
          </div>
        </div>

        <!-- Security info -->
        <div class="rounded-xl bg-slate-900 p-4 text-white relative overflow-hidden">
          <div class="pointer-events-none absolute -bottom-3 -right-3 opacity-5">
            <AlertTriangle :size="80" />
          </div>
          <div class="flex items-center gap-2 mb-2">
            <AlertTriangle :size="14" class="text-amber-400" />
            <span class="text-xs font-medium">Protokol Keamanan</span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed mb-3">
            Perpindahan tab/layar dicatat. Pelanggaran ke-2 akan menghentikan ujian otomatis.
          </p>
          <div class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
            <span class="text-[10px] text-slate-500 uppercase tracking-widest">Pelanggaran</span>
            <span class="text-sm font-semibold" :class="violations > 0 ? 'text-red-400' : 'text-emerald-400'">
              {{ violations }} / 1
            </span>
          </div>
        </div>

        <!-- Progress summary -->
        <div class="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Ringkasan</p>
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs">
              <span class="text-slate-500">Dijawab</span>
              <span class="font-medium text-slate-700">{{ questions.filter(q => Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : !!answers[q.id]).length }} / {{ questions.length }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-slate-500">Belum dijawab</span>
              <span class="font-medium" :class="questions.filter(q => Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : !!answers[q.id]).length < questions.length ? 'text-amber-600' : 'text-emerald-600'">
                {{ questions.length - questions.filter(q => Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : !!answers[q.id]).length }}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
