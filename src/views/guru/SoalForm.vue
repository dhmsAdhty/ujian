<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/auth'
import { 
  ChevronLeft, 
  Save, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  X,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-vue-next'
import { GlassCard, PrimaryButton, FormInput, AppSelect } from '@/components/ui'
import Swal from 'sweetalert2'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)

// Form State
const form = ref({
  judul: '',
  konten: '',
  tipe_soal: 'pilihan_ganda',
  mapel_id: '',
  kelas_id: '',
  media_url: '',
  bobot: 1,
  kunci_jawaban: '', // For essay
  options: [
    { text: '', is_correct: true, label: 'A' },
    { text: '', is_correct: false, label: 'B' },
    { text: '', is_correct: false, label: 'C' },
    { text: '', is_correct: false, label: 'D' }
  ]
})

// Options for dropdowns
const mapels = ref([])
const kelasList = ref([])

const fetchData = async () => {
  loading.value = true
  
  // Fetch dependencies
  const [mRes, kRes] = await Promise.all([
    supabase.from('mapel').select('*'),
    supabase.from('kelas').select('*')
  ])
  mapels.value = mRes.data || []
  kelasList.value = kRes.data || []

  // If edit mode, fetch question data
  if (isEdit.value) {
    const { data, error } = await supabase
      .from('bank_soal')
      .select('*')
      .eq('id', route.params.id)
      .single()
    
    if (error) {
      Swal.fire('Error', 'Gagal memuat data soal', 'error')
      router.push('/guru/soal')
    } else {
      // Mapping options from JSONB if stored that way or separate table
      // Assuming JSONB for simplicity in this demo
      form.value = { ...data, options: data.options || form.value.options }
    }
  }
  loading.value = false
}

onMounted(fetchData)

const addOption = () => {
  const nextLabel = String.fromCharCode(65 + form.value.options.length) // E, F, etc.
  form.value.options.push({ text: '', is_correct: false, label: nextLabel })
}

const removeOption = (index) => {
  if (form.value.options.length <= 2) return
  form.value.options.splice(index, 1)
  // Re-label
  form.value.options.forEach((opt, idx) => {
    opt.label = String.fromCharCode(65 + idx)
  })
}

const setCorrect = (index) => {
  form.value.options.forEach((opt, idx) => {
    opt.is_correct = idx === index
  })
}

// Media Upload
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  loading.value = true
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `soal-media/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, file)

  if (uploadError) {
    Swal.fire('Upload Gagal', uploadError.message, 'error')
  } else {
    const { data } = supabase.storage.from('media').getPublicUrl(filePath)
    form.value.media_url = data.publicUrl
  }
  loading.value = false
}

// Save Logic
const handleSave = async () => {
  if (!form.value.judul || !form.value.mapel_id || !form.value.kelas_id) {
    return Swal.fire('Peringatan', 'Mohon lengkapi data wajib (*)', 'warning')
  }

  saving.value = true
  const payload = {
    ...form.value,
    guru_id: authStore.user.id,
    updated_at: new Date().toISOString()
  }

  const { error } = isEdit.value 
    ? await supabase.from('bank_soal').update(payload).eq('id', route.params.id)
    : await supabase.from('bank_soal').insert([payload])

  if (error) {
    Swal.fire('Gagal Menyimpan', error.message, 'error')
  } else {
    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: `Soal berhasil ${isEdit.value ? 'diperbarui' : 'ditambahkan'}.`,
      timer: 1500,
      showConfirmButton: false
    })
    router.push('/guru/soal')
  }
  saving.value = false
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-20">
    <!-- Breadcrumb & Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="pressable-soft rounded-xl border border-venus-200/90 bg-white p-2.5 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100"
          @click="router.push('/guru/soal')"
        >
          <ChevronLeft :size="20" />
        </button>
        <div>
          <h1 class="text-3xl font-bold text-venus-900 tracking-tight">
            {{ isEdit ? 'Edit Soal' : 'Buat Soal Baru' }}
          </h1>
          <p class="text-venus-500 mt-1">Lengkapi detail instruksi dan kunci jawaban pertanyaan.</p>
        </div>
      </div>
      <PrimaryButton @click="handleSave" :loading="saving" class="min-w-[140px] shadow-primary-500/30">
        <Save :size="18" />
        Simpan Soal
      </PrimaryButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Form Content -->
      <div class="lg:col-span-2 space-y-6">
        <GlassCard padding="p-8">
          <div class="space-y-6">
            <div class="flex items-center gap-2 pb-4 border-b border-venus-100">
              <div class="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <FileText :size="18" />
              </div>
              <h3 class="font-bold text-venus-800 uppercase tracking-widest text-sm">Konten Pertanyaan</h3>
            </div>

            <FormInput 
              v-model="form.judul"
              label="Judul / Inti Pertanyaan *"
              placeholder="Contoh: Menghitung Luas Penampang Lingkaran"
            />

            <div class="space-y-2">
              <label class="text-sm font-semibold text-venus-700 ml-1">Deskripsi Lengkap / Narasi Soal</label>
              <textarea 
                v-model="form.konten"
                rows="6"
                placeholder="Tuliskan pertanyaan atau narasi soal di sini..."
                class="form-input resize-none py-4"
              ></textarea>
            </div>

            <!-- Media Preview/Upload -->
            <div class="space-y-3">
              <label class="text-sm font-semibold text-venus-700 ml-1">Media Gambar (Opsional)</label>
              <div v-if="form.media_url" class="relative h-48 w-full overflow-hidden rounded-2xl border border-venus-200/90">
                <img :src="form.media_url" class="h-full w-full bg-venus-50 object-contain" />
                <button
                  type="button"
                  class="pressable-soft absolute right-2 top-2 rounded-xl bg-red-500 p-2 text-white shadow-ios-md transition-[transform,opacity] duration-200 ease-ios"
                  @click="form.media_url = ''"
                  aria-label="Hapus gambar"
                >
                  <X :size="16" />
                </button>
              </div>
              <div v-else class="relative">
                <input 
                  type="file" 
                  @change="handleFileUpload" 
                  accept="image/*"
                  class="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div
                  class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-venus-200/90 p-8 text-venus-400 transition-[border-color,background-color] duration-250 ease-ios active:border-primary-400/70 active:bg-primary-50/20"
                >
                  <ImageIcon :size="32" class="mb-2" />
                  <span class="text-sm font-bold">Tekan untuk unggah gambar</span>
                  <span class="text-[10px] uppercase font-black tracking-widest mt-1">Format: JPG, PNG, WEBP (Maks 2MB)</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <!-- Dynamic Answer Section -->
        <GlassCard padding="p-8">
          <div class="flex items-center justify-between pb-6 border-b border-venus-100 mb-6">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <CheckCircle2 :size="18" />
              </div>
              <h3 class="font-bold text-venus-800 uppercase tracking-widest text-sm">
                {{ form.tipe_soal === 'pilihan_ganda' ? 'Opsi Jawaban' : 'Kunci Pedoman Essay' }}
              </h3>
            </div>
            
            <PrimaryButton 
              v-if="form.tipe_soal === 'pilihan_ganda'"
              @click="addOption"
              variant="secondary"
              class="!py-1.5 !px-4 text-xs"
            >
              <Plus :size="14" /> Tambah Opsi
            </PrimaryButton>
          </div>

          <!-- Pilihan Ganda -->
          <div v-if="form.tipe_soal === 'pilihan_ganda'" class="space-y-4">
            <div 
              v-for="(opt, index) in form.options" 
              :key="index"
              class="flex items-center gap-4 animate-fade-in"
            >
              <button 
                @click="setCorrect(index)"
                class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all border shrink-0"
                :class="opt.is_correct ? 'border-emerald-500 bg-emerald-500 text-white shadow-ios-sm ring-4 ring-emerald-500/10' : 'border-venus-200 bg-white text-venus-400 focus-visible:border-primary-400 focus-visible:outline-none'"
              >
                {{ opt.label }}
              </button>
              
              <FormInput 
                v-model="opt.text"
                placeholder="Teks pilihan jawaban..."
                class="flex-1"
              />

              <button
                type="button"
                class="pressable-soft rounded-lg p-2.5 text-venus-300 transition-[color,transform] duration-200 ease-ios active:text-red-500"
                title="Hapus Opsi"
                @click="removeOption(index)"
              >
                <Trash2 :size="18" />
              </button>
            </div>
          </div>

          <!-- Essay -->
          <div v-else class="space-y-4">
            <div class="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700 mb-2">
              <HelpCircle :size="20" class="shrink-0" />
              <p class="text-xs leading-relaxed font-medium">
                Tuliskan poin-poin kunci jawaban atau pedoman koreksi untuk membantu Anda saat proses penilaian manual nanti.
              </p>
            </div>
            <textarea 
              v-model="form.kunci_jawaban"
              rows="6"
              placeholder="Tuliskan pedoman jawaban yang benar di sini..."
              class="form-input resize-none py-4"
            ></textarea>
          </div>
        </GlassCard>
      </div>

      <!-- Right Column: Settings -->
      <div class="space-y-6">
        <GlassCard padding="p-6">
          <h3 class="font-bold text-venus-800 uppercase tracking-widest text-xs mb-6 pb-2 border-b border-venus-100">Atribut Soal</h3>
          
          <div class="space-y-5">
            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-venus-400 uppercase tracking-widest ml-1">Tipe Pertanyaan</label>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  @click="form.tipe_soal = 'pilihan_ganda'"
                  class="py-2.5 rounded-xl text-xs font-bold border transition-all"
                  :class="form.tipe_soal === 'pilihan_ganda' ? 'border-primary-600 bg-primary-600 text-white shadow-ios-md' : 'border-venus-200 bg-white text-venus-500 shadow-ios-sm'"
                >
                  Pilihan Ganda
                </button>
                <button 
                  @click="form.tipe_soal = 'essay'"
                  class="py-2.5 rounded-xl text-xs font-bold border transition-all"
                  :class="form.tipe_soal === 'essay' ? 'border-primary-600 bg-primary-600 text-white shadow-ios-md' : 'border-venus-200 bg-white text-venus-500 shadow-ios-sm'"
                >
                  Essay
                </button>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-venus-400 uppercase tracking-widest ml-1">Mata Pelajaran *</label>
              <AppSelect v-model="form.mapel_id" placeholder="Pilih Mapel">
                <option v-for="m in mapels" :key="m.id" :value="m.id">{{ m.nama }}</option>
              </AppSelect>
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-venus-400 uppercase tracking-widest ml-1">Target Kelas *</label>
              <AppSelect v-model="form.kelas_id" placeholder="Pilih Kelas">
                <option v-for="k in kelasList" :key="k.id" :value="k.id">{{ k.nama }}</option>
              </AppSelect>
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-venus-400 uppercase tracking-widest ml-1">Bobot Nilai</label>
              <input 
                v-model.number="form.bobot"
                type="number"
                min="1"
                class="form-input text-sm font-bold"
              />
              <p class="text-[10px] text-venus-400 ml-1">Gunakan bobot lebih besar untuk soal sulit.</p>
            </div>
          </div>
        </GlassCard>

        <!-- Info Card -->
        <div
          class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 to-primary-500 p-6 text-white shadow-ios-lg shadow-primary-500/20"
        >
          <div class="pointer-events-none absolute -bottom-4 -right-4 opacity-[0.12]">
            <HelpCircle :size="120" stroke-width="1.25" />
          </div>
          <h4 class="font-bold mb-2">Tips Pendidik</h4>
          <ul class="text-xs space-y-2 opacity-90 leading-relaxed font-medium">
            <li>• Berikan judul yang unik untuk memudahkan pencarian di Bank Soal.</li>
            <li>• Gunakan media gambar untuk memperjelas konteks pertanyaan numerikal atau visual.</li>
            <li>• Pastikan bobot total pada satu paket ujian selaras dengan standar penilaian.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
