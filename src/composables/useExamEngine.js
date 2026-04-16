import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { useExamCache } from '@/composables/useExamCache'
import Swal from 'sweetalert2'

export function useExamEngine(examId, { onViolationSubmit, onTimerEnd } = {}) {
  const authStore = useAuthStore()
  const questions = ref([])
  const currentIndex = ref(0)
  const answers = ref({})
  const timer = ref(0) // in seconds
  const violations = ref(0)
  const loading = ref(true)
  const isFinished = ref(false)
  const interval = ref(null)
  const examInfo = ref({ nama: '', mapel: '', kelas: '', totalSoal: 0 })
  const toleransiPelanggaran = ref(1) // default 1x
  const nilaiMaxPg = ref(100) // default ×100, dapat di-override dari app_settings

  const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
  const progress = computed(() => Math.round(((currentIndex.value + 1) / questions.value.length) * 100))

  async function loadExam() {
    if (!authStore.user) return
    loading.value = true

    // Fetch settings dari admin (toleransi pelanggaran & bobot nilai PG)
    const { data: settingData } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['toleransi_pelanggaran', 'nilai_max_pg'])
    ;(settingData || []).forEach(row => {
      if (row.key === 'toleransi_pelanggaran') toleransiPelanggaran.value = Number(row.value)
      if (row.key === 'nilai_max_pg') nilaiMaxPg.value = Number(row.value)
    })

    // Fetch exam details (durasi, acak_soal, nama, mapel, kelas)
    const { data: ujianData, error: ujianError } = await supabase
      .from('ujian')
      .select('durasi, acak_soal, nama, mapel(nama), kelas(nama)')
      .eq('id', examId)
      .single()

    if (ujianError) {
      Swal.fire('Gagal', 'Gagal memuat data ujian', 'error')
      loading.value = false
      return
    }

    // Fetch soal via relasi ujian_soal, menggunakan sistem cache agar meringankan beban DB
    const { fetchExamSoal } = useExamCache()
    const { data: soalListUnsorted, error: soalError } = await fetchExamSoal(examId)

    if (soalError || !soalListUnsorted) {
      Swal.fire('Gagal', 'Gagal memuat soal ujian', 'error')
    } else {
      let soalList = [...soalListUnsorted]

      // Acak soal jika diaktifkan
      if (ujianData.acak_soal) {
        soalList = soalList.sort(() => Math.random() - 0.5)
      }

      questions.value = soalList
      timer.value = (ujianData.durasi || 60) * 60
      examInfo.value = {
        nama: ujianData.nama || '',
        mapel: ujianData.mapel?.nama || '',
        kelas: ujianData.kelas?.nama || '',
        totalSoal: soalList.length
      }
      startTimer()
    }

    loading.value = false
  }

  function startTimer() {
    interval.value = setInterval(async () => {
      if (timer.value > 0) {
        timer.value--
      } else {
        clearInterval(interval.value)
        const success = await submitExam('Waktu Habis!')
        if (success) {
          await Swal.fire({
            icon: 'warning',
            title: 'Waktu Habis!',
            text: 'Waktu ujian telah habis. Jawaban Anda otomatis dikumpulkan.',
            confirmButtonColor: '#4318ff',
            confirmButtonText: 'Kembali ke Dashboard'
          })
          onTimerEnd?.()
        }
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

    // Hitung skor otomatis untuk pilihan ganda
    let pgCorrect = 0
    questions.value.forEach(q => {
      if (q.tipe_soal === 'pilihan_ganda' || q.tipe_soal === 'pilihan_ganda_kompleks') {
        const jawaban = answers.value[q.id]
        if (!jawaban) return
        if (q.tipe_soal === 'pilihan_ganda_kompleks') {
          // Multi-select: partial scoring
          // Nilai = (pilihan benar - pilihan salah) / total kunci, min 0
          const kunciLabels = (q.options || []).filter(o => o.is_correct).map(o => o.label)
          const jawabanArr = Array.isArray(jawaban) ? jawaban : [jawaban]
          const benarCount = jawabanArr.filter(j => kunciLabels.includes(j)).length
          const salahCount = jawabanArr.filter(j => !kunciLabels.includes(j)).length
          const partial = kunciLabels.length > 0
            ? Math.max(0, (benarCount - salahCount) / kunciLabels.length)
            : 0
          pgCorrect += partial
        } else {
          // PG biasa: benar penuh atau 0
          const kunci = q.kunci_jawaban || (q.options || []).find(o => o.is_correct)?.label
          if (kunci && jawaban === kunci) pgCorrect++
        }
      }
    })
    const totalSoalPg = questions.value.filter(q => q.tipe_soal !== 'essay').length
    const totalSoal = questions.value.length

    // Formula baru:
    // Nilai PG = (Jawaban Benar PG / Total Soal PG) × nilaiMaxPg
    // Nilai Akhir (saat submit) = Nilai PG (karena essay belum dinilai)
    const pgScore = totalSoalPg > 0
      ? parseFloat((pgCorrect / totalSoalPg * nilaiMaxPg.value).toFixed(2))
      : 0

    // Cek apakah ada row reset (submitted_at null) untuk ujian ini
    const { data: existingRow } = await supabase
      .from('exam_results')
      .select('id')
      .eq('exam_id', examId)
      .eq('siswa_id', authStore.user?.id)
      .is('submitted_at', null)
      .maybeSingle()

    let error
    if (existingRow) {
      ;({ error } = await supabase.from('exam_results').update({
        answers: answers.value,
        violations: violations.value,
        pg_score: pgScore,
        pg_correct: pgCorrect,
        total_soal: totalSoal,
        submitted_at: new Date().toISOString()
      }).eq('id', existingRow.id))
    } else {
      ;({ error } = await supabase.from('exam_results').insert([{
        exam_id: examId,
        siswa_id: authStore.user?.id,
        answers: answers.value,
        violations: violations.value,
        pg_score: pgScore,
        pg_correct: pgCorrect,
        total_soal: totalSoal,
        submitted_at: new Date().toISOString()
      }]))
    }

    if (error) {
      console.error('Error submitting exam:', error)
      isFinished.value = false // allow retry
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim',
        html: 'Jawaban gagal dikirim ke server.<br><small class="text-slate-400">' + error.message + '</small>',
        confirmButtonColor: '#e31a1a',
        confirmButtonText: 'Coba Lagi'
      })
      return false
    }

    Swal.fire({
      icon: 'success',
      title: reason === 'Ujian Selesai' ? 'Jawaban Terkirim!' : reason,
      text: 'Jawaban Anda telah berhasil dikirim ke server.',
      confirmButtonColor: '#4318ff',
      confirmButtonText: 'Kembali ke Dashboard'
    })
    return true
  }

  // Security Logic — toleransi dari pengaturan admin
  async function handleBlur() {
    if (isFinished.value) return

    violations.value++

    if (violations.value < toleransiPelanggaran.value) {
      // Masih dalam batas toleransi — beri peringatan
      Swal.fire({
        icon: 'warning',
        title: `Peringatan! (${violations.value}/${toleransiPelanggaran.value})`,
        text: `Jangan berpindah tab atau layar saat ujian berlangsung. Pelanggaran ke-${toleransiPelanggaran.value} akan menghentikan ujian.`,
        confirmButtonColor: '#4318ff',
        timer: 4000,
        timerProgressBar: true
      })
    } else {
      // Batas tercapai — submit dan redirect
      const success = await submitExam('Ujian Dihentikan: Pelanggaran Keamanan!')
      if (success) {
        await Swal.fire({
          icon: 'error',
          title: 'Pelanggaran Terdeteksi',
          text: `Anda telah berpindah tab/layar sebanyak ${violations.value}x. Ujian otomatis dihentikan dan jawaban dikumpulkan.`,
          confirmButtonColor: '#e31a1a',
          confirmButtonText: 'Kembali ke Dashboard'
        })
        onViolationSubmit?.()
      }
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
    examInfo,
    nextQuestion,
    prevQuestion,
    submitExam
  }
}
