<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton } from '@/components/ui'
import Swal from 'sweetalert2'

const props = defineProps({
  show: Boolean,
  mapelId: String,
  kelasId: String
})

const emit = defineEmits(['close', 'success'])

const authStore = useAuthStore()
const loading = ref(false)
const fileData = ref(null)
const errorCount = ref(0)
const successCount = ref(0)

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    {
      judul: 'Contoh Soal Matematika',
      konten: 'Berapakah hasil dari 2 + 2?',
      tipe_soal: 'pilihan_ganda',
      options: '[{"text":"3","is_correct":false,"label":"A"},{"text":"4","is_correct":true,"label":"B"},{"text":"5","is_correct":false,"label":"C"},{"text":"6","is_correct":false,"label":"D"}]',
      bobot: 1
    }
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, 'template_bank_soal.xlsx')
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (evt) => {
    const bstr = evt.target.result
    const wb = XLSX.read(bstr, { type: 'binary' })
    const wsname = wb.SheetNames[0]
    const ws = wb.Sheets[wsname]
    const data = XLSX.utils.sheet_to_json(ws)
    fileData.value = data
  }
  reader.readAsBinaryString(file)
}

const processImport = async () => {
  if (!fileData.value || fileData.value.length === 0) return

  loading.value = true
  successCount.value = 0
  errorCount.value = 0

  const batchSize = 10
  for (let i = 0; i < fileData.value.length; i += batchSize) {
    const chunk = fileData.value.slice(i, i + batchSize).map(row => ({
      ...row,
      guru_id: authStore.user.id,
      mapel_id: props.mapelId,
      kelas_id: props.kelasId,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      created_at: new Date().toISOString()
    }))

    const { error } = await supabase.from('bank_soal').insert(chunk)
    
    if (error) {
      errorCount.value += chunk.length
    } else {
      successCount.value += chunk.length
    }
  }

  loading.value = false
  
  if (errorCount.value === 0) {
    Swal.fire('Berhasil!', `${successCount.value} soal berhasil diunggah.`, 'success')
    emit('success')
  } else {
    Swal.fire('Selesai dengan error', `${successCount.value} berhasil, ${errorCount.value} gagal. Pastikan format kolom sesuai.`, 'warning')
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" @click="emit('close')"></div>
    
    <GlassCard padding="p-0" class="w-full max-w-2xl relative z-10 animate-fade-in-up overflow-hidden">
      <!-- Header -->
      <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <Upload :size="20" />
          </div>
          <div>
            <h3 class="font-bold text-slate-800 text-lg">Import Massal Excel</h3>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Bank Soal Module</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
          <X :size="20" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-8 space-y-8">
        <!-- Template Download Section -->
        <div class="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div class="flex gap-4">
            <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Info :size="20" />
            </div>
            <div class="space-y-1">
              <h4 class="font-bold text-blue-800 text-sm">Gunakan Template Standar</h4>
              <p class="text-[11px] text-blue-600 leading-relaxed font-medium">Pastikan kolom judul, konten, tipe_soal, options, dan bobot terisi sesuai format untuk menghindari error saat proses upload.</p>
            </div>
          </div>
          <button 
            @click="downloadTemplate" 
            class="px-4 py-2 bg-white border border-blue-200 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-50 transition-all whitespace-nowrap shadow-sm"
          >
            Unduh Template
          </button>
        </div>

        <!-- File Upload Area -->
        <div v-if="!fileData" class="relative group">
          <input 
            type="file" 
            @change="handleFileSelect" 
            accept=".xlsx, .csv"
            class="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <div class="p-10 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-all group">
            <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-orange-50 transition-all">
              <FileSpreadsheet :size="32" class="group-hover:text-orange-500" />
            </div>
            <span class="text-lg font-bold text-slate-700">Pilih File Excel / CSV</span>
            <span class="text-xs font-medium mt-1">Hanya mendukung format .xlsx dan .csv</span>
          </div>
        </div>

        <!-- Preview State -->
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-orange-600">
                <FileSpreadsheet :size="20" />
              </div>
              <div>
                <p class="text-sm font-bold text-slate-800">Siap Diunggah</p>
                <p class="text-xs text-slate-500">{{ fileData.length }} Baris Data Terdeteksi</p>
              </div>
            </div>
            <button @click="fileData = null" class="text-xs font-bold text-red-500 hover:underline">Ganti File</button>
          </div>

          <!-- Progress / Instructions -->
          <div v-if="loading" class="space-y-3">
            <div class="flex justify-between text-xs font-bold text-slate-500">
              <span>Sedang memproses...</span>
              <span>100%</span>
            </div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-orange-500 w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Area -->
      <div class="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
        <button 
          @click="emit('close')"
          class="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          Batal
        </button>
        <PrimaryButton 
          @click="processImport" 
          :disabled="!fileData || loading" 
          :loading="loading"
          class="shadow-orange-500/20"
        >
          Unggah Soal Sekarang
        </PrimaryButton>
      </div>
    </GlassCard>
  </div>
</template>
