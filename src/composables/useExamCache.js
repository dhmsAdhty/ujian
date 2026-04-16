import { ref } from 'vue'
import { supabase } from '@/services/supabase'

/* Global cache maps */
const examSoalCache = ref({}) // examId -> { data: [] } (Valid entire session, no TTL constraint mentioned)
const studentListCache = ref({}) // kelasId -> { data: [], timestamp: number } (TTL: 60 seconds)
const mapelCache = ref({ data: [], timestamp: 0 }) // TTL: 10 minutes

export function useExamCache() {
  
  async function fetchExamSoal(examId) {
    // Check global cache
    if (examSoalCache.value[examId] && examSoalCache.value[examId].data) {
      return { data: examSoalCache.value[examId].data, error: null }
    }

    // Fetch soal via relasi ujian_soal, hanya soal yang terdaftar di ujian ini
    const { data: soalData, error: soalError } = await supabase
      .from('ujian_soal')
      .select('urutan, bank_soal(id, konten, tipe_soal, media_url, options, kunci_jawaban)')
      .eq('ujian_id', examId)
      .order('urutan', { ascending: true })

    if (!soalError && soalData) {
      // populate cache
      examSoalCache.value[examId] = {
        data: soalData.map(row => row.bank_soal)
      }
      return { data: examSoalCache.value[examId].data, error: null }
    }
    
    return { data: null, error: soalError }
  }

  async function fetchStudentList(kelasId) {
    const NOW = Date.now()
    const TTL = 60 * 1000 // 60 seconds

    if (
      studentListCache.value[kelasId] && 
      studentListCache.value[kelasId].data &&
      (NOW - studentListCache.value[kelasId].timestamp < TTL)
    ) {
      return { data: studentListCache.value[kelasId].data, error: null }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, kelas_id')
      .eq('kelas_id', kelasId)
      .eq('role', 'siswa')
      .order('full_name', { ascending: true })

    if (!error && data) {
      studentListCache.value[kelasId] = {
        data,
        timestamp: NOW
      }
    }

    return { data, error }
  }

  async function fetchMapel() {
    const NOW = Date.now()
    const TTL = 10 * 60 * 1000 // 10 minutes

    if (mapelCache.value.data.length > 0 && (NOW - mapelCache.value.timestamp < TTL)) {
      return { data: mapelCache.value.data, error: null }
    }

    const { data, error } = await supabase
      .from('mapel')
      .select('id, nama')
      .order('nama', { ascending: true })

    if (!error && data) {
      mapelCache.value = {
        data,
        timestamp: NOW
      }
    }

    return { data, error }
  }

  return {
    fetchExamSoal,
    fetchStudentList,
    fetchMapel
  }
}
