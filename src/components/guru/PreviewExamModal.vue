<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/services/supabase'
import {
  X, Clock, Send, LayoutList, AlertTriangle,
  ChevronLeft, ChevronRight, CheckCircle2
} from 'lucide-vue-next'
import Swal from 'sweetalert2'
import { toast } from 'gooey-toast'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  ujianId: { type: String, required: true }
})
const emit = defineEmits(['close'])

const loading = ref(true)
const examInfo = ref({ nama: '', mapel: '', kelas: '', totalSoal: 0 })
const questions = ref([])
const currentIndex = ref(0)
const answers = ref({})
const timer = ref(5400) // Default 90 menit (dalam detik)

// Timer Simulation
let intervalId = null
const startTimer = () => {
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(() => {
    if (timer.value > 0) timer.value--
  }, 1000)
}

const formatTimer = computed(() => {
  const h = Math.floor(timer.value / 3600)
  const m = Math.floor((timer.value % 3600) / 60)
  const s = timer.value % 60
  const pad = (num) => String(num).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
})

const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const progress = computed(() => {
  if (!questions.value.length) return 0
  const answeredCount = questions.value.filter(q => {
    const ans = answers.value[q.id]
    if (q.tipe_soal === 'pilihan_ganda_kompleks') return ans && Array.isArray(ans) && ans.length > 0
    return ans !== undefined && ans !== ''
  }).length
  return Math.round((answeredCount / questions.value.length) * 100)
})

watch(() => props.isOpen, async (open) => {
  if (!open) {
    if (intervalId) clearInterval(intervalId)
    return
  }
  
  loading.value = true
  currentIndex.value = 0
  answers.value = {}
  
  try {
    // 1. Fetch Ujian & detail
    const { data: ujianData, error: uErr } = await supabase
      .from('ujian')
      .select('nama, durasi, mapel(nama), kelas(nama)')
      .eq('id', props.ujianId)
      .single()

    if (uErr) throw uErr

    timer.value = (ujianData.durasi || 90) * 60
    examInfo.value = {
      nama: ujianData.nama,
      mapel: ujianData.mapel?.nama || '—',
      kelas: ujianData.kelas?.nama || '—',
      totalSoal: 0
    }

    // 2. Fetch Soal Ujian
    const { data: soalData, error: sErr } = await supabase
      .from('ujian_soal')
      .select('urutan, bank_soal(id, konten, tipe_soal, options, kunci_jawaban, media_url)')
      .eq('ujian_id', props.ujianId)
      .order('urutan', { ascending: true })

    if (sErr) throw sErr

    questions.value = (soalData || []).map(r => r.bank_soal).filter(Boolean)
    examInfo.value.totalSoal = questions.value.length
    startTimer()
  } catch (err) {
    toast.error({ title: 'Gagal Memuat', description: 'Tidak dapat mengambil pratinjau soal ujian.' })
    emit('close')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

// Methods mirip ActiveExam.vue
const prevQuestion = () => {
  if (currentIndex.value > 0) currentIndex.value--
}

const nextQuestion = () => {
  if (currentIndex.value < questions.value.length - 1) currentIndex.value++
}

const selectOption = (optionLabel) => {
  if (!currentQuestion.value) return
  const id = currentQuestion.value.id
  if (currentQuestion.value.tipe_soal === 'pilihan_ganda_kompleks') {
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

const renderKonten = (html) => {
  if (!html) return ''
  if (!html.includes('<')) return html.replace(/\n/g, '<br>')
  return html
}

const simulateSubmit = async () => {
  const unanswered = questions.value.filter(q => {
    const ans = answers.value[q.id]
    if (q.tipe_soal === 'pilihan_ganda_kompleks') return !ans || (Array.isArray(ans) && ans.length === 0)
    return !ans
  }).length

  let title = 'Kumpulkan Jawaban?'
  let html = 'Semua soal telah dijawab. Simulasi pengumpulan jawaban siswa.'
  let icon = 'question'

  if (unanswered > 0) {
    title = 'Ada Soal Belum Dijawab'
    html = `Masih ada <strong>${unanswered} soal</strong> yang belum dijawab.<br>Yakin ingin mengumpulkan dalam simulasi?`
    icon = 'warning'
  }

  const result = await Swal.fire({
    title,
    html,
    icon,
    showCancelButton: true,
    confirmButtonColor: '#4318ff',
    confirmButtonText: 'Ya, Kumpulkan',
    cancelButtonText: 'Kembali'
  })

  if (result.isConfirmed) {
    Swal.fire({
      icon: 'success',
      title: 'Simulasi Selesai!',
      text: 'POV Siswa berjalan dengan baik. Semua fungsionalitas berfungsi sebagaimana mestinya.',
      confirmButtonColor: '#4318ff'
    })
    emit('close')
  }
}
</script>

<template>
  <teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] flex flex-col bg-slate-900/60 backdrop-blur-md animate-fade-in"
    >
      <!-- Top Bar Dashboard Preview Mode -->
      <div class="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm shrink-0">
        <div class="flex items-center gap-2">
          <span class="animate-pulse w-2.5 h-2.5 rounded-full bg-white"></span>
          <span>MODE PREVIEW POV SISWA (Hanya Simulasi — Jawaban Tidak Disimpan)</span>
        </div>
        <button
          @click="$emit('close')"
          class="flex items-center gap-1 bg-black/15 hover:bg-black/30 px-2.5 py-1 rounded-lg transition"
        >
          <X :size="12" /> Keluar Preview
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
        
        <!-- Loading Skeleton -->
        <div v-if="loading" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-50">
          <div class="text-center space-y-3">
            <div class="w-10 h-10 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
            <p class="text-xs text-slate-400 tracking-widest uppercase">Mempersiapkan Soal POV Siswa...</p>
          </div>
        </div>

        <template v-else>
          <!-- Mock ActiveExam.vue Header -->
          <header class="shrink-0 bg-white border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center justify-between gap-4 z-50">
            <div class="flex items-center gap-3 min-w-0">
              <div>
                <p class="text-sm font-semibold text-slate-800 truncate max-w-[240px]">{{ examInfo.nama }}</p>
                <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                  <span>{{ examInfo.kelas }}</span>
                  <span>·</span>
                  <span>{{ examInfo.mapel }}</span>
                  <span>·</span>
                  <span>{{ examInfo.totalSoal }} soal</span>
                </div>
              </div>
            </div>

            <!-- Countdown Timer Mock -->
            <div
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-medium transition-colors bg-slate-50 border-slate-200 text-slate-700"
            >
              <Clock :size="14" />
              {{ formatTimer }}
            </div>

            <!-- Submit Button Mock -->
            <button
              @click="simulateSubmit"
              class="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-primary-600 text-white text-xs sm:text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Send :size="14" />
              <span>Akhiri Ujian</span>
            </button>
          </header>

          <!-- Progress bar mock -->
          <div class="shrink-0 h-0.5 bg-slate-100">
            <div
              class="h-full bg-primary-500 transition-all duration-500"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>

          <!-- Body Area -->
          <div class="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            <!-- Soal Container -->
            <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div class="max-w-2xl mx-auto space-y-6">

                <!-- Alert Petunjuk Tenang Untuk Guru -->
                <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 flex items-start gap-3 shadow-ios-sm">
                  <AlertTriangle :size="18" class="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 class="text-xs font-bold uppercase tracking-wider">💡 Info Mode Pratinjau (Simulasi)</h4>
                    <p class="text-[11px] text-amber-700 mt-1 leading-relaxed">
                      Halaman ini adalah simulasi tampilan siswa secara penuh. Anda dapat mengeklik jawaban, mencoba navigasi, atau menyelesaikan ujian. 
                      <strong class="text-amber-900 font-bold">Tenang saja, seluruh data simulasi ini bersifat sementara, TIDAK disimpan ke database, dan TIDAK akan memengaruhi nilai riil siswa!</strong>
                    </p>
                  </div>
                </div>

                <!-- Question View Card -->
                <div v-if="currentQuestion" class="bg-white rounded-2xl border border-slate-100 p-5 sm:p-7 shadow-sm">
                  <div class="flex items-center gap-2 mb-5">
                    <span class="w-7 h-7 rounded-lg bg-primary-600 text-white text-xs font-semibold flex items-center justify-center">
                      {{ currentIndex + 1 }}
                    </span>
                    <span class="text-xs text-slate-400">dari {{ questions.length }} soal</span>
                  </div>

                  <!-- Media -->
                  <div v-if="currentQuestion.media_url" class="mb-5 rounded-xl overflow-hidden border border-slate-100">
                    <img :src="currentQuestion.media_url" class="w-full h-auto max-h-72 object-contain bg-white" alt="Lampiran Soal" />
                  </div>

                  <!-- Konten Soal -->
                  <div
                    class="soal-konten text-base sm:text-lg text-slate-800 leading-relaxed"
                    v-html="renderKonten(currentQuestion.konten)"
                  />
                </div>

                <!-- Options: Pilihan Ganda -->
                <div v-if="currentQuestion?.tipe_soal === 'pilihan_ganda'" class="space-y-2.5">
                  <button
                    v-for="opt in currentQuestion.options"
                    :key="opt.label"
                    @click="selectOption(opt.label)"
                    class="w-full flex items-start gap-4 px-4 py-3.5 rounded-xl border text-left transition-all duration-150"
                    :class="answers[currentQuestion.id] === opt.label
                      ? 'border-primary-400 bg-primary-50 text-primary-800'
                      : 'border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50'"
                  >
                    <span
                      class="w-8 h-8 shrink-0 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors mt-0.5"
                      :class="answers[currentQuestion.id] === opt.label
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-500'"
                    >{{ opt.label }}</span>
                    <div class="flex-1 space-y-2">
                      <span class="text-sm block">{{ opt.text }}</span>
                      <img
                        v-if="opt.image_url"
                        :src="opt.image_url"
                        class="max-h-48 w-auto rounded-lg border border-slate-100 object-contain bg-white"
                        alt="Gambar opsi jawaban"
                      />
                    </div>
                    <CheckCircle2
                      v-if="answers[currentQuestion.id] === opt.label"
                      :size="16"
                      class="text-primary-500 shrink-0 mt-1"
                    />
                  </button>
                </div>

                <!-- Options: Pilihan Ganda Kompleks -->
                <div v-else-if="currentQuestion?.tipe_soal === 'pilihan_ganda_kompleks'" class="space-y-2.5">
                  <p class="text-[11px] text-purple-500 font-semibold px-1 mb-1">Pilih semua jawaban yang benar (bisa lebih dari 1)</p>
                  <button
                    v-for="opt in currentQuestion.options"
                    :key="opt.label"
                    @click="selectOption(opt.label)"
                    class="w-full flex items-start gap-4 px-4 py-3.5 rounded-xl border text-left transition-all duration-150"
                    :class="isSelectedKompleks(opt.label)
                      ? 'border-purple-400 bg-purple-50 text-purple-800'
                      : 'border-slate-100 bg-white text-slate-700 hover:border-purple-200 hover:bg-purple-50/40'"
                  >
                    <span
                      class="w-8 h-8 shrink-0 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors border-2 mt-0.5"
                      :class="isSelectedKompleks(opt.label)
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-slate-200 text-slate-500'"
                    >
                      <CheckCircle2 v-if="isSelectedKompleks(opt.label)" :size="16" />
                      <span v-else>{{ opt.label }}</span>
                    </span>
                    <div class="flex-1 space-y-2">
                      <span class="text-sm block">{{ opt.text }}</span>
                      <img
                        v-if="opt.image_url"
                        :src="opt.image_url"
                        class="max-h-48 w-auto rounded-lg border border-slate-100 object-contain bg-white"
                        alt="Gambar opsi jawaban"
                      />
                    </div>
                  </button>
                </div>

                <!-- Essay -->
                <div v-else-if="currentQuestion?.tipe_soal === 'essay'" class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <label class="text-xs text-slate-400 uppercase tracking-widest block mb-3">Jawaban Anda (Simulasi)</label>
                  <textarea
                    v-model="answers[currentQuestion.id]"
                    rows="8"
                    class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition"
                    placeholder="Tulis jawaban simulasi Anda di sini..."
                  ></textarea>
                </div>

                <!-- Navigation bar bawah -->
                <div class="flex gap-3 pb-4">
                  <button
                    @click="prevQuestion"
                    :disabled="currentIndex === 0"
                    class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft :size="16" /> Sebelumnya
                  </button>

                  <button
                    v-if="isLastQuestion()"
                    @click="simulateSubmit"
                    class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Send :size="16" /> Kumpulkan
                  </button>
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

            <!-- Sidebar navigasi kanan mock -->
            <aside class="hidden lg:flex flex-col w-72 shrink-0 border-l border-slate-100 bg-white overflow-y-auto p-5 gap-5">
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
                    class="aspect-square w-full flex items-center justify-center rounded-lg text-xs font-semibold transition-all border"
                    :class="[
                      currentIndex === i
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : (Array.isArray(answers[soal.id]) ? answers[soal.id].length > 0 : !!answers[soal.id])
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
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

              <!-- Security info box mock -->
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
                  <span class="text-sm font-semibold text-emerald-400">
                    0 / 1
                  </span>
                </div>
              </div>

              <!-- Info overview pengerjaan mock -->
              <div class="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Ringkasan</p>
                <div class="space-y-1.5">
                  <div class="flex justify-between text-xs">
                    <span class="text-slate-500">Dijawab</span>
                    <span class="font-medium text-slate-700">
                      {{ questions.filter(q => Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : !!answers[q.id]).length }} / {{ questions.length }}
                    </span>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-slate-500">Belum dijawab</span>
                    <span
                      class="font-medium"
                      :class="questions.filter(q => Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : !!answers[q.id]).length < questions.length ? 'text-amber-600' : 'text-emerald-600'"
                    >
                      {{ questions.length - questions.filter(q => Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : !!answers[q.id]).length }}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </template>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.soal-konten :deep(p) { margin: 0 0 0.3em; }
.soal-konten :deep(h1) { font-size: 1.4em; font-weight: 800; margin: 0.4em 0 0.2em; }
.soal-konten :deep(h2) { font-size: 1.2em; font-weight: 700; margin: 0.4em 0 0.2em; }
.soal-konten :deep(h3) { font-size: 1.05em; font-weight: 700; margin: 0.3em 0 0.15em; }
.soal-konten :deep(ul) { padding-left: 1.4em; list-style: disc; margin: 0.3em 0; }
.soal-konten :deep(ol) { padding-left: 1.4em; list-style: decimal; margin: 0.3em 0; }
.soal-konten :deep(li) { margin: 0.1em 0; }
.soal-konten :deep(strong) { font-weight: 700; }
.soal-konten :deep(em) { font-style: italic; }
.soal-konten :deep(u) { text-decoration: underline; }
.soal-konten :deep(s) { text-decoration: line-through; }
.soal-konten :deep(blockquote) {
  border-left: 3px solid #6d5ce7;
  padding: 3px 12px;
  margin: 0.4em 0;
  color: #475569;
  background: #f8f7ff;
  border-radius: 0 6px 6px 0;
}
.soal-konten :deep(code) {
  background: #f1f0fb;
  border-radius: 4px;
  padding: 1px 5px;
  font-family: monospace;
  font-size: 0.88em;
  color: #5b21b6;
}
.soal-konten :deep(hr) {
  border: none;
  border-top: 1.5px solid #e2e8f0;
  margin: 0.6em 0;
}
.soal-konten :deep(mark) { border-radius: 3px; padding: 0 2px; }
</style>
