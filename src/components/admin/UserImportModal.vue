<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { supabase } from '@/services/supabase'
import { X, Upload, FileSpreadsheet, Download, Info, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import { PrimaryButton } from '@/components/ui'
import Swal from 'sweetalert2'

const emit = defineEmits(['close', 'imported'])
defineProps({ show: Boolean })

const fileData = ref(null)
const fileName = ref('')
const loading = ref(false)
const results = ref(null) // { success, failed }

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    { full_name: 'Budi Santoso', email: 'budi@sekolah.sch.id', password: 'password123', role: 'siswa' },
    { full_name: 'Siti Rahayu', email: 'siti@sekolah.sch.id', password: 'password123', role: 'guru' },
  ])
  // Set column widths
  ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template User')
  XLSX.writeFile(wb, 'template_import_user.xlsx')
}

const handleFile = (e) => {
  const file = e.target.files[0]
  if (!file) return
  fileName.value = file.name
  results.value = null

  const reader = new FileReader()
  reader.onload = (evt) => {
    const wb = XLSX.read(evt.target.result, { type: 'binary' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    fileData.value = XLSX.utils.sheet_to_json(ws)
  }
  reader.readAsBinaryString(file)
}

const processImport = async () => {
  if (!fileData.value?.length) return
  loading.value = true

  let success = 0
  let failed = 0
  const failedRows = []

  for (const row of fileData.value) {
    if (!row.email || !row.password || !row.role) {
      failed++
      failedRows.push(row.email || '(no email)')
      continue
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: String(row.email).trim(),
        password: String(row.password),
        options: {
          data: {
            full_name: row.full_name || '',
            role: row.role,
          },
        },
      })
      // Trigger handle_new_user di DB akan insert ke profiles otomatis
      if (error) throw error
      success++
    } catch {
      failed++
      failedRows.push(row.email)
    }
  }

  loading.value = false
  results.value = { success, failed, failedRows }

  if (failed === 0) {
    Swal.fire({ icon: 'success', title: 'Import Selesai', text: `${success} user berhasil ditambahkan.`, timer: 2000, showConfirmButton: false })
    emit('imported')
  }
}

const reset = () => {
  fileData.value = null
  fileName.value = ''
  results.value = null
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @mousedown.self="emit('close')"
      >
        <div class="absolute inset-0 bg-venus-900/40 backdrop-blur-sm" />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div
            v-if="show"
            class="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-venus-100 bg-white shadow-venus"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-venus-100 px-6 py-5">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                  <Upload :size="18" stroke-width="2" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-venus-900">Import User dari Excel</h3>
                  <p class="text-xs text-venus-400">Upload file .xlsx untuk menambah banyak user sekaligus</p>
                </div>
              </div>
              <button
                type="button"
                class="pressable-soft rounded-lg p-1.5 text-venus-400 hover:bg-venus-100"
                @click="emit('close')"
              >
                <X :size="18" />
              </button>
            </div>

            <!-- Body -->
            <div class="space-y-5 px-6 py-6">
              <!-- Template download -->
              <div class="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <div class="flex items-center gap-3">
                  <Info :size="18" class="shrink-0 text-blue-500" />
                  <div>
                    <p class="text-sm font-semibold text-blue-800">Gunakan template standar</p>
                    <p class="text-xs text-blue-500">Kolom: full_name, email, password, role</p>
                  </div>
                </div>
                <button
                  type="button"
                  class="pressable-soft flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-ios-sm transition-colors hover:bg-blue-50"
                  @click="downloadTemplate"
                >
                  <Download :size="14" />
                  Unduh
                </button>
              </div>

              <!-- File upload area -->
              <div v-if="!fileData" class="relative">
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  class="absolute inset-0 z-10 cursor-pointer opacity-0"
                  @change="handleFile"
                />
                <div
                  class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-venus-200 bg-venus-50/50 py-10 text-venus-400 transition-colors hover:border-primary-300 hover:bg-primary-50/20"
                >
                  <FileSpreadsheet :size="36" class="mb-3 text-venus-300" />
                  <p class="text-sm font-semibold text-venus-600">Klik atau seret file ke sini</p>
                  <p class="mt-1 text-xs">Format .xlsx atau .csv</p>
                </div>
              </div>

              <!-- File preview -->
              <div v-else class="space-y-3">
                <div class="flex items-center justify-between rounded-xl border border-venus-100 bg-venus-50 px-4 py-3">
                  <div class="flex items-center gap-3">
                    <FileSpreadsheet :size="20" class="text-primary-600" />
                    <div>
                      <p class="text-sm font-semibold text-venus-800">{{ fileName }}</p>
                      <p class="text-xs text-venus-400">{{ fileData.length }} baris data terdeteksi</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="text-xs font-semibold text-red-500 hover:text-red-700"
                    @click="reset"
                  >
                    Ganti
                  </button>
                </div>

                <!-- Results -->
                <div v-if="results" class="space-y-2">
                  <div class="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 :size="16" />
                    {{ results.success }} user berhasil diimport
                  </div>
                  <div v-if="results.failed > 0" class="rounded-lg bg-red-50 px-3 py-2">
                    <div class="flex items-center gap-2 text-sm font-semibold text-red-700">
                      <AlertCircle :size="16" />
                      {{ results.failed }} user gagal
                    </div>
                    <p class="mt-1 text-xs text-red-500">{{ results.failedRows.join(', ') }}</p>
                  </div>
                </div>

                <!-- Loading progress -->
                <div v-if="loading" class="rounded-xl bg-venus-50 px-4 py-3">
                  <div class="mb-2 flex justify-between text-xs font-semibold text-venus-500">
                    <span>Memproses...</span>
                  </div>
                  <div class="h-1.5 overflow-hidden rounded-full bg-venus-100">
                    <div class="h-full animate-pulse rounded-full bg-primary-500" style="width: 100%" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 border-t border-venus-100 px-6 py-4">
              <button
                type="button"
                class="rounded-xl px-5 py-2.5 text-sm font-semibold text-venus-500 hover:bg-venus-50"
                @click="emit('close')"
              >
                Tutup
              </button>
              <PrimaryButton :disabled="!fileData || loading" :loading="loading" @click="processImport">
                <Upload :size="16" />
                Mulai Import
              </PrimaryButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
