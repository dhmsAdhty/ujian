<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/services/supabase'
import { 
  GraduationCap, 
  Search, 
  FileSpreadsheet, 
  Eye, 
  CheckCircle2, 
  XCircle,
  Clock,
  ChevronRight,
  Edit3,
  ExternalLink
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, EmptyState, AppSelect } from '@/components/ui'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

const loading = ref(true)
const results = ref([])
const exams = ref([])
const selectedExam = ref('')

// Fetch Results
const fetchData = async () => {
  loading.value = true
  
  // 1. Fetch available exams for the teacher
  const { data: examData } = await supabase.from('exams').select('*')
  exams.value = examData || []

  // 2. Fetch results (Mock for demo, in real app joins tables)
  const { data: resultData, error } = await supabase
    .from('exam_results')
    .select('*, profiles(full_name)')
    .order('submitted_at', { ascending: false })

  if (error) {
    Swal.fire('Error', 'Gagal memuat rekap nilai', 'error')
  } else {
    // Add dummy scores for PG visualization
    results.value = (resultData || []).map(r => ({
      ...r,
      pgScore: Math.floor(Math.random() * 60) + 20, // Dummy
      essayStatus: Math.random() > 0.5 ? 'graded' : 'pending'
    }))
  }
  
  loading.value = false
}

onMounted(fetchData)

const exportToExcel = () => {
  if (results.value.length === 0) return

  const data = results.value.map(r => ({
    'Nama Siswa': r.profiles?.full_name,
    'Waktu Selesai': new Date(r.submitted_at).toLocaleString(),
    'Skor PG': r.pgScore,
    'Status Essay': r.essayStatus === 'graded' ? 'Sudah Dinilai' : 'Perlu Koreksi',
    'Total Pelanggaran': r.violations
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai')
  XLSX.writeFile(wb, `Rekap_Nilai_CBT_${new Date().toLocaleDateString()}.xlsx`)
}

const openGradingModal = (result) => {
  Swal.fire({
    title: `Koreksi Essay: ${result.profiles?.full_name}`,
    html: `
      <div class="text-left space-y-4">
        <div class="p-3 bg-venus-50 rounded-lg border border-venus-100">
          <p class="text-[10px] font-black text-venus-400 uppercase tracking-widest mb-1">Pertanyaan Essay</p>
          <p class="text-sm font-bold text-venus-700">Jelaskan cara kerja fotosintesis pada tumbuhan hijau?</p>
        </div>
        <div class="p-3 bg-orange-50 rounded-lg border border-orange-100">
          <p class="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Kunci Pedoman</p>
          <p class="text-sm font-medium text-orange-700 italic">Harus menyebutkan klorofil, cahaya matahari, CO2, dan menghasilkan H2O/Glukosa.</p>
        </div>
        <div class="p-4 bg-white border border-primary-100 rounded-xl shadow-sm">
          <p class="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-2">Jawaban Siswa</p>
          <p class="text-sm text-venus-600 leading-relaxed font-bold">Proses tumbuhan buat makanan pake matahari dan klorofil terus ngeluarin oksigen juga.</p>
        </div>
        <div class="mt-4">
          <label class="block text-xs font-bold text-venus-500 mb-1">Berikan Nilai (0-100)</label>
          <input id="swal-input-score" class="w-full px-4 py-3 rounded-xl border border-venus-200 focus:border-primary-500 outline-none" type="number" value="85">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Simpan Nilai',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#4318ff',
    preConfirm: () => {
      const score = document.getElementById('swal-input-score').value
      if (!score) {
        Swal.showValidationMessage('Mohon masukkan nilai')
      }
      return score
    }
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire('Tersimpan!', 'Nilai essay berhasil diperbarui.', 'success')
      fetchData()
    }
  })
}
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header Area -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold text-venus-900 tracking-tight">Rekap Nilai Siswa</h1>
        <p class="text-venus-500 mt-1">Pantau perolehan skor dan lakukan koreksi manual jawaban essay.</p>
      </div>
      <PrimaryButton @click="exportToExcel" :disabled="loading || results.length === 0" class="shadow-xl">
        <FileSpreadsheet :size="18" />
        Ekspor Excel (.xlsx)
      </PrimaryButton>
    </div>

    <!-- Filters -->
    <GlassCard padding="p-4">
      <div class="flex flex-col lg:flex-row gap-4 items-center">
        <div class="w-full lg:flex-1">
          <div class="relative group">
            <Search class="absolute left-3.5 top-1/2 -tranvenus-y-1/2 text-venus-400" :size="20" />
            <input type="text" placeholder="Cari nama siswa..." class="form-input pl-11" />
          </div>
        </div>
        <div class="flex gap-4 w-full lg:w-auto">
          <AppSelect
            v-model="selectedExam"
            placeholder="Pilih Paket Ujian"
            class="lg:w-64"
          >
            <option v-for="ex in exams" :key="ex.id" :value="ex.id">{{ ex.judul }}</option>
          </AppSelect>
        </div>
      </div>
    </GlassCard>

    <!-- Results Table -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-venus-50/50 text-[10px] font-black text-venus-400 uppercase tracking-[2px] border-b border-venus-100">
              <th class="py-5 px-6">Identitas Siswa</th>
              <th class="py-5 px-6">Waktu Selesai</th>
              <th class="py-5 px-6 text-center">Skor PG</th>
              <th class="py-5 px-6 text-center">Satus Essay</th>
              <th class="py-5 px-6 text-center">Pelanggaran</th>
              <th class="py-5 px-6 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-venus-50/50">
              <td v-for="j in 6" :key="j" class="py-6 px-6">
                <div class="h-4 bg-venus-100 rounded-full animate-pulse"></div>
              </td>
            </tr>
          </tbody>

          <tbody v-else-if="results.length === 0">
            <tr>
              <td colspan="6">
                <EmptyState 
                  title="Belum Ada Hasil"
                  description="Belum ada siswa yang menyelesaikan paket ujian ini."
                />
              </td>
            </tr>
          </tbody>

          <tbody v-else class="divide-y divide-venus-100">
            <tr v-for="res in results" :key="res.id">
              <td class="py-5 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-600 font-bold border border-white">
                    {{ res.profiles?.full_name?.charAt(0) }}
                  </div>
                  <div>
                    <h4 class="font-bold text-venus-800 tracking-tight">{{ res.profiles?.full_name }}</h4>
                    <span class="text-[10px] text-venus-400 uppercase font-black tracking-widest">NIS: 1240102{{ res.id.split('-')[0].charAt(0) }}</span>
                  </div>
                </div>
              </td>
              <td class="py-5 px-6">
                <div class="flex items-center gap-2 text-sm text-venus-500 font-medium">
                  <Clock :size="14" />
                  {{ new Date(res.submitted_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) }}
                </div>
              </td>
              <td class="py-5 px-6 text-center">
                <span class="text-lg font-black text-venus-800 tracking-tight">{{ res.pgScore }}</span>
              </td>
              <td class="py-5 px-6 text-center">
                <span 
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                  :class="res.essayStatus === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'"
                >
                  <component :is="res.essayStatus === 'graded' ? CheckCircle2 : Clock" :size="12" />
                  {{ res.essayStatus === 'graded' ? 'Selesai' : 'Koreksi' }}
                </span>
              </td>
              <td class="py-5 px-6 text-center">
                <span 
                  v-if="res.violations > 0"
                  class="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-md"
                >
                  {{ res.violations }}x
                </span>
                <span v-else class="text-emerald-500 font-bold text-xs">Aman</span>
              </td>
              <td class="py-5 px-6 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    @click="openGradingModal(res)"
                    class="pressable-soft flex items-center gap-1.5 rounded-xl border border-venus-200/80 bg-white p-2 text-primary-600 shadow-ios-sm transition-[transform,opacity] duration-200 ease-ios"
                  >
                    <Edit3 :size="18" />
                    <span class="text-xs font-semibold">Koreksi</span>
                  </button>
                  <button
                    type="button"
                    class="pressable-soft rounded-xl border border-venus-200/80 bg-white p-2 text-venus-400 shadow-ios-sm transition-[transform,opacity] duration-200 ease-ios active:text-venus-600"
                  >
                    <ExternalLink :size="18" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <!-- Bottom Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="glass-card p-6 border-emerald-100 bg-emerald-50/30">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
            <CheckCircle2 :size="18" />
          </div>
          <h4 class="text-xs font-black text-emerald-800 uppercase tracking-widest">Lulus KKM</h4>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-black text-emerald-700">85%</span>
          <span class="text-xs font-bold text-emerald-500">+12% dari target</span>
        </div>
      </div>
      
      <div class="glass-card p-6 border-red-100 bg-red-50/30">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center">
            <XCircle :size="18" />
          </div>
          <h4 class="text-xs font-black text-red-800 uppercase tracking-widest">Dibawah KKM</h4>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-black text-red-700">15%</span>
          <span class="text-xs font-bold text-red-400">12 Siswa</span>
        </div>
      </div>

      <div class="glass-card p-6 flex items-center justify-center border-dashed">
         <div class="text-center">
           <p class="text-xs font-bold text-venus-400 uppercase tracking-widest mb-1">Rata-rata Kelas</p>
           <h3 class="text-4xl font-black text-venus-800 tracking-tighter">78.5</h3>
         </div>
      </div>
    </div>
  </div>
</template>
