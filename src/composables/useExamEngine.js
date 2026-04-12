import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/services/supabase'
import Swal from 'sweetalert2'

export function useExamEngine(examId) {
  const questions = ref([])
  const currentIndex = ref(0)
  const answers = ref({})
  const timer = ref(0) // in seconds
  const violations = ref(0)
  const loading = ref(true)
  const isFinished = ref(false)
  const interval = ref(null)

  const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
  const progress = computed(() => Math.round(((currentIndex.value + 1) / questions.value.length) * 100))

  async function loadExam() {
    loading.value = true
    
    // Fetch exam details & questions
    // Note: In real app, we fetch from many-to-many relationship table 'exam_questions'
    // For this duplication, we'll fetch from bank_soal where exam_id matches
    const { data: soalData, error: soalError } = await supabase
      .from('bank_soal')
      .select('*')
      .is('deleted_at', null)
      .limit(50) // Demo limit

    if (soalError) {
      Swal.fire('Gagal', 'Gagal memuat soal ujian', 'error')
    } else {
      questions.value = soalData
      timer.value = 60 * 60 // 60 minutes for demo
      startTimer()
    }
    
    loading.value = false
  }

  function startTimer() {
    interval.value = setInterval(() => {
      if (timer.value > 0) {
        timer.value--
      } else {
        submitExam('Waktu Habis!')
      }
    }, 1000)
  }

  function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
    }
  }

  function prevQuestion() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  const formatTimer = computed(() => {
    const hours = Math.floor(timer.value / 3600)
    const minutes = Math.floor((timer.value % 3600) / 60)
    const seconds = timer.value % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  async function submitExam(reason = 'Ujian Selesai') {
    clearInterval(interval.value)
    isFinished.value = true
    
    const { error } = await supabase.from('exam_results').insert([{
      exam_id: examId,
      answers: answers.value,
      violations: violations.value,
      submitted_at: new Date().toISOString()
    }])

    if (error) {
      console.error('Error submitting exam:', error)
    }

    Swal.fire({
      icon: 'success',
      title: reason,
      text: 'Jawaban Anda telah berhasil terikirim ke server.',
      confirmButtonColor: '#f97316'
    })
  }

  // Security Logic
  function handleBlur() {
    if (isFinished.value) return
    
    violations.value++
    
    if (violations.value > 1) {
      submitExam('Ujian Dihentikan: Pelanggaran Keamanan!')
      Swal.fire({
        icon: 'error',
        title: 'Pelanggaran Terdeteksi',
        text: 'Anda telah berpindah tab/layar lebih dari 1 kali. Ujian otomatis dihentikan.',
        confirmButtonColor: '#ef4444'
      })
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Peringatan!',
        text: 'Jangan berpindah tab atau aplikasi saat ujian sedang berlangsung! Sekali lagi, ujian akan dihentikan.',
        confirmButtonColor: '#f97316'
      })
    }
  }

  onMounted(() => {
    window.addEventListener('blur', handleBlur)
    loadExam()
  })

  onUnmounted(() => {
    window.removeEventListener('blur', handleBlur)
    clearInterval(interval.value)
  })

  return {
    questions,
    currentIndex,
    currentQuestion,
    answers,
    timer,
    formatTimer,
    loading,
    progress,
    violations,
    nextQuestion,
    prevQuestion,
    submitExam
  }
}
