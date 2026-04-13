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
import { uploadToCloudinary } from '@/services/cloudinary'
import Swal from 'sweetalert2'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const uploadingOptionIdx = ref(null) // track which option image is uploading

const form = ref({
  konten: '',
  tipe_soal: 'pilihan_ganda',
  mapel_id: '',
  kelas_id: '',
  media_url: '',
  kunci_jawaban: '',
  options: [
    { text: '', image_url: '', is_correct: true, label: 'A' },
    { text: '', image_url: '', is_correct: false, label: 'B' },
    { text: '', image_url: '', is_correct: false, label: 'C' },
    { text: '', image_url: '', is_correct: false, label: 'D' }
  ]
})

const mapels = ref([])
const kelasList = ref([])

const fetchData = async () => {
  loading.value = true

  // Ambil mapel_id yang ditugaskan ke guru ini
  const { data: penugasan } = await supabase
    .from('guru_mapel')
    .select('mapel_id')
    .eq('guru_id', authStore.user.id)

  const mapelIds = (penugasan || []).map(r => r.mapel_id).filter(Boolean)

  const [mapelRes, kRes] = await Promise.all([
    mapelIds.length > 0
      ? supabase.from('mapel').select('id, nama').in('id', mapelIds).order('nama')
      : Promise.resolve({ data: [] }),
    supabase.from('kelas').select('*')
  ])

  mapels.value = mapelRes.data || []
  kelasList.value = kRes.data || []

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
      const opts = (data.options || form.value.options).map((o, idx) => ({
        text: o.text || '',
        image_url: o.image_url || '',
        is_correct: o.is_correct || false,
        label: String.fromCharCode(65 + idx)
      }))
      form.value = { ...data, options: opts }
    }
  }
  loading.value = false
}

onMounted(fetchData)

const addOption = () => {
  const nextLabel = String.fromCharCode(65 + form.value.options.length)
  form.value.options.push({ text: '', image_url: '', is_correct: false, label: nextLabel })
}

const removeOption = (index) => {
  if (form.value.options.length <= 2) return
  form.value.options.splice(index, 1)
  form.value.options.forEach((opt, idx) => { opt.label = String.fromCharCode(65 + idx) })
}

// PG biasa: hanya 1 jawaban benar
const setCorrect = (index) => {
  if (form.value.tipe_soal === 'pilihan_ganda_kompleks') {
    // toggle multi
    form.value.options[index].is_correct = !form.value.options[index].is_correct
  } else {
    form.value.options.forEach((opt, idx) => { opt.is_correct = idx === index })
  }
}

// Saat ganti tipe, reset is_correct agar tidak konflik
const setTipe = (tipe) => {
  form.value.tipe_soal = tipe
  // reset semua ke false kecuali index 0 untuk PG biasa
  form.value.options.forEach((opt, idx) => {
    opt.is_correct = tipe === 'pilihan_ganda' ? idx === 0 : false
  })
}

// Upload gambar soal utama
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  loading.value = true
  const url = await uploadImage(file, 'soal-media')
  if (url) form.value.media_url = url
  loading.value = false
}

// Upload gambar per opsi jawaban
const handleOptionImageUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return
  uploadingOptionIdx.value = index
  const url = await uploadImage(file, 'soal-media/options')
  if (url) form.value.options[index].image_url = url
  uploadingOptionIdx.value = null
}

const uploadImage = async (file) => {
  const url = await uploadToCloudinary(file, 'ujian_sma')
  if (!url) Swal.fire('Upload Gagal', 'Gagal mengunggah gambar ke Cloudinary', 'error')
  return url
}

const handleSave = async () => {
  if (!form.value.konten || !form.value.mapel_id || !form.value.kelas_id) {
    return Swal.fire('Peringatan', 'Mohon lengkapi pertanyaan, mata pelajaran, dan kelas', 'warning')
  }

  saving.value = true
  const payload = {
    judul: form.value.konten.slice(0, 100),
    konten: form.value.konten,
    tipe_soal: form.value.tipe_soal,
    mapel_id: form.value.mapel_id,
    kelas_id: form.value.kelas_id,
    media_url: form.value.media_url,
    kunci_jawaban: form.value.kunci_jawaban,
    options: form.value.options,
    guru_id: authStore.user.id,
    updated_at: new Date().toISOString()
  }

  const { error } = isEdit.value
    ? await supabase.from('bank_soal').update(payload).eq('id', route.params.id)
    : await supabase.from('bank_soal').insert([payload])

  if (error) {
    Swal.fire('Gagal Menyimpan', error.message, 'error')
  } else {
    Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Soal berhasil ${isEdit.value ? 'diperbarui' : 'ditambahkan'}.`, timer: 1500, showConfirmButton: false })
    router.push('/guru/soal')
  }
  saving.value = false
}
</script>

<template>
  <div class="mx-auto max-w-5xl animate-fade-in-up space-y-8 pb-20">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="pressable-soft rounded-xl border border-venus-200/90 bg-white p-2.5 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100"
          @click="router.push('/guru/soal')"
        >
          <ChevronLeft :size="20" />
        </button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-venus-900">
            {{ isEdit ? 'Edit Soal' : 'Buat Soal Baru' }}
          </h1>
          <p class="mt-1 text-venus-500">Lengkapi pertanyaan dan kunci jawaban.</p>
        </div>
      </div>
      <PrimaryButton @click="handleSave" :loading="saving" class="min-w-[140px] shadow-primary-500/30">
        <Save :size="18" />
        Simpan Soal
      </PrimaryButton>
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <!-- Left: Konten -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Pertanyaan -->
        <GlassCard padding="p-8">
          <div class="space-y-6">
            <div class="flex items-center gap-2 border-b border-venus-100 pb-4">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <FileText :size="18" />
              </div>
              <h3 class="text-sm font-bold uppercase tracking-widest text-venus-800">Pertanyaan</h3>
            </div>

            <div class="space-y-2">
              <label class="ml-1 text-sm font-semibold text-venus-700">Teks Pertanyaan *</label>
              <textarea
                v-model="form.konten"
                rows="5"
                placeholder="Tuliskan pertanyaan di sini..."
                class="form-input resize-none py-4"
              />
            </div>

            <!-- Media soal -->
            <div class="space-y-3">
              <label class="ml-1 text-sm font-semibold text-venus-700">Gambar Soal (Opsional)</label>
              <div v-if="form.media_url" class="relative h-48 w-full overflow-hidden rounded-2xl border border-venus-200/90">
                <img :src="form.media_url" class="h-full w-full bg-venus-50 object-contain" />
                <button
                  type="button"
                  class="pressable-soft absolute right-2 top-2 rounded-xl bg-red-500 p-2 text-white shadow-ios-md"
                  @click="form.media_url = ''"
                  aria-label="Hapus gambar"
                >
                  <X :size="16" />
                </button>
              </div>
              <div v-else class="relative">
                <input type="file" @change="handleFileUpload" accept="image/*" class="absolute inset-0 z-10 cursor-pointer opacity-0" />
                <div class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-venus-200/90 p-8 text-venus-400">
                  <ImageIcon :size="28" class="mb-2" />
                  <span class="text-sm font-bold">Tekan untuk unggah gambar</span>
                  <span class="mt-1 text-[10px] font-black uppercase tracking-widest">JPG, PNG, WEBP · Maks 2MB</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <!-- Jawaban -->
        <GlassCard padding="p-8">
          <div class="mb-6 flex items-center justify-between border-b border-venus-100 pb-6">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <CheckCircle2 :size="18" />
              </div>
              <div>
                <h3 class="text-sm font-bold uppercase tracking-widest text-venus-800">
                  {{ form.tipe_soal === 'essay' ? 'Kunci Pedoman Essay' : 'Opsi Jawaban' }}
                </h3>
                <p v-if="form.tipe_soal === 'pilihan_ganda_kompleks'" class="mt-0.5 text-[11px] text-purple-500 font-semibold">
                  Bisa memilih lebih dari 1 jawaban benar
                </p>
              </div>
            </div>
            <PrimaryButton
              v-if="form.tipe_soal !== 'essay'"
              @click="addOption"
              variant="secondary"
              class="!px-4 !py-1.5 text-xs"
            >
              <Plus :size="14" /> Tambah Opsi
            </PrimaryButton>
          </div>

          <!-- Pilihan Ganda & PG Kompleks -->
          <div v-if="form.tipe_soal !== 'essay'" class="space-y-5">
            <div
              v-for="(opt, index) in form.options"
              :key="index"
              class="animate-fade-in rounded-2xl border border-venus-100 bg-venus-50/40 p-4"
            >
              <div class="flex items-start gap-3">
                <!-- Tombol pilih benar: radio untuk PG biasa, checkbox untuk PG kompleks -->
                <button
                  type="button"
                  @click="setCorrect(index)"
                  class="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border font-bold transition-all"
                  :class="[
                    form.tipe_soal === 'pilihan_ganda_kompleks' ? 'rounded-lg' : 'rounded-xl',
                    opt.is_correct
                      ? form.tipe_soal === 'pilihan_ganda_kompleks'
                        ? 'border-purple-500 bg-purple-500 text-white shadow-ios-sm ring-4 ring-purple-500/10'
                        : 'border-emerald-500 bg-emerald-500 text-white shadow-ios-sm ring-4 ring-emerald-500/10'
                      : 'border-venus-200 bg-white text-venus-400'
                  ]"
                >
                  {{ opt.label }}
                </button>

                <div class="flex-1 space-y-3">
                  <FormInput
                    v-model="opt.text"
                    :placeholder="`Teks pilihan ${opt.label}...`"
                  />

                  <!-- Gambar opsi -->
                  <div v-if="opt.image_url" class="relative h-32 overflow-hidden rounded-xl border border-venus-200/90">
                    <img :src="opt.image_url" class="h-full w-full bg-venus-50 object-contain" />
                    <button
                      type="button"
                      class="pressable-soft absolute right-1.5 top-1.5 rounded-lg bg-red-500 p-1.5 text-white"
                      @click="opt.image_url = ''"
                      aria-label="Hapus gambar"
                    >
                      <X :size="14" />
                    </button>
                  </div>
                  <div v-else class="relative">
                    <input
                      type="file"
                      @change="handleOptionImageUpload($event, index)"
                      accept="image/*"
                      class="absolute inset-0 z-10 cursor-pointer opacity-0"
                    />
                    <div class="flex items-center gap-2 rounded-xl border border-dashed border-venus-200 px-3 py-2 text-venus-400">
                      <span v-if="uploadingOptionIdx === index" class="text-xs">Mengunggah...</span>
                      <template v-else>
                        <ImageIcon :size="16" />
                        <span class="text-xs">Tambah gambar opsi (opsional)</span>
                      </template>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  class="pressable-soft mt-1 rounded-lg p-2 text-venus-300 transition-[color,transform] duration-200 ease-ios active:text-red-500"
                  @click="removeOption(index)"
                  aria-label="Hapus opsi"
                >
                  <Trash2 :size="18" />
                </button>
              </div>
            </div>

            <p class="ml-1 text-xs text-venus-400">
              {{ form.tipe_soal === 'pilihan_ganda_kompleks'
                ? 'Klik huruf opsi untuk toggle jawaban benar (bisa lebih dari 1).'
                : 'Klik huruf opsi untuk menandai jawaban yang benar.' }}
            </p>
          </div>

          <!-- Essay -->
          <div v-else class="space-y-4">
            <div class="flex gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-blue-700">
              <HelpCircle :size="20" class="shrink-0" />
              <p class="text-xs font-medium leading-relaxed">
                Tuliskan poin-poin kunci jawaban sebagai pedoman koreksi manual.
              </p>
            </div>
            <textarea
              v-model="form.kunci_jawaban"
              rows="6"
              placeholder="Tuliskan pedoman jawaban yang benar di sini..."
              class="form-input resize-none py-4"
            />
          </div>
        </GlassCard>
      </div>

      <!-- Right: Atribut -->
      <div class="space-y-6">
        <GlassCard padding="p-6">
          <h3 class="mb-6 border-b border-venus-100 pb-2 text-xs font-bold uppercase tracking-widest text-venus-800">Atribut Soal</h3>
          <div class="space-y-5">
            <div class="space-y-1.5">
              <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Tipe Pertanyaan</label>
              <div class="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  @click="setTipe('pilihan_ganda')"
                  class="rounded-xl border py-2.5 text-xs font-bold transition-all"
                  :class="form.tipe_soal === 'pilihan_ganda' ? 'border-primary-600 bg-primary-600 text-white shadow-ios-md' : 'border-venus-200 bg-white text-venus-500 shadow-ios-sm'"
                >
                  Pilihan Ganda
                </button>
                <button
                  type="button"
                  @click="setTipe('pilihan_ganda_kompleks')"
                  class="rounded-xl border py-2.5 text-xs font-bold transition-all"
                  :class="form.tipe_soal === 'pilihan_ganda_kompleks' ? 'border-purple-600 bg-purple-600 text-white shadow-ios-md' : 'border-venus-200 bg-white text-venus-500 shadow-ios-sm'"
                >
                  PG Kompleks
                </button>
                <button
                  type="button"
                  @click="setTipe('essay')"
                  class="rounded-xl border py-2.5 text-xs font-bold transition-all"
                  :class="form.tipe_soal === 'essay' ? 'border-primary-600 bg-primary-600 text-white shadow-ios-md' : 'border-venus-200 bg-white text-venus-500 shadow-ios-sm'"
                >
                  Essay
                </button>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Mata Pelajaran *</label>
              <AppSelect
                v-model="form.mapel_id"
                placeholder="Pilih Mapel"
                :options="mapels.map(m => ({ value: m.id, label: m.nama }))"
              />
            </div>

            <div class="space-y-1.5">
              <label class="ml-1 text-[11px] font-black uppercase tracking-widest text-venus-400">Target Kelas *</label>
              <AppSelect
                v-model="form.kelas_id"
                placeholder="Pilih Kelas"
                :options="kelasList.map(k => ({ value: k.id, label: k.nama }))"
              />
            </div>
          </div>
        </GlassCard>

        <!-- Info rumus nilai -->
        <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 to-primary-500 p-5 text-white shadow-ios-lg shadow-primary-500/20">
          <div class="pointer-events-none absolute -bottom-4 -right-4 opacity-10">
            <HelpCircle :size="100" stroke-width="1.25" />
          </div>
          <p class="mb-2 text-xs font-bold uppercase tracking-widest opacity-70">Rumus Penilaian</p>
          <p class="font-mono text-sm font-bold">Nilai = (Benar / Total) × 100</p>
          <p class="mt-2 text-xs font-medium leading-relaxed opacity-80">
            Setiap soal bernilai sama. Nilai akhir dihitung otomatis dari jumlah jawaban benar dibagi total soal dikali 100.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
