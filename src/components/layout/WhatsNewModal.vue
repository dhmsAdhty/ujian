<script setup>
import { ref, onMounted, computed } from 'vue'
import { Sparkles, X, CheckCircle, Trash2, Activity, PlusCircle, PenTool, ShieldAlert, MonitorCheck, RotateCcw, ChevronRight, ChevronLeft, Eye, Settings } from 'lucide-vue-next'
import { PrimaryButton } from '@/components/ui'

const props = defineProps({
  role: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['startTour'])

const isVisible = ref(false)
const viewMode = ref('updates') // 'updates' | 'tutorial'
const currentSlide = ref(0)
const VERSION_KEY = 'cbt_ats_whatsnew_v1.3'

onMounted(() => {
  const hasSeen = localStorage.getItem(VERSION_KEY)
  if (!hasSeen) {
    setTimeout(() => {
      isVisible.value = true
    }, 500)
  }
})

const closeModal = () => {
  isVisible.value = false
  localStorage.setItem(VERSION_KEY, 'true')
}

const nextSlide = () => {
  if (currentSlide.value < tutorialSlides.value.length - 1) {
    currentSlide.value++
  } else {
    closeModal()
    emit('startTour')
  }
}

const prevSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--
  }
}

const updates = computed(() => {
  if (props.role === 'admin') {
    return [
      {
        id: 1,
        title: 'Bobot PG Khusus Per-Kelas',
        description: 'Atur batas maksimum nilai PG secara dinamis per jenjang kelas (override) untuk fleksibilitas kurikulum (misal: SMP vs SMA).',
        icon: Settings,
        colorClass: 'text-amber-500 bg-amber-50',
      },
      {
        id: 2,
        title: 'Audit Nilai Adaptif Cerdas',
        description: 'Sistem audit nilai otomatis mendeteksi konfigurasi bobot khusus per kelas untuk menghindari deteksi inkonsistensi yang keliru.',
        icon: MonitorCheck,
        colorClass: 'text-indigo-500 bg-indigo-50',
      }
    ]
  }
  
  if (props.role === 'guru') {
    return [
      {
        id: 1,
        title: 'Pratinjau POV Siswa Interaktif',
        description: 'Tinjau tampilan ujian persis seperti di layar siswa dengan simulator lengkap (timer, sidebar nomor soal, & jawaban) tanpa mengotori database.',
        icon: Eye,
        colorClass: 'text-amber-500 bg-amber-50',
      },
      {
        id: 2,
        title: 'Pecahan Nilai & Deteksi Essay',
        description: 'Visualisasi kolom Nilai Akhir kini memuat pecahan rincian PG & Essay, lengkap dengan deteksi otomatis ujian tanpa essay (murni PG).',
        icon: CheckCircle,
        colorClass: 'text-emerald-500 bg-emerald-50',
      },
      {
        id: 3,
        title: 'Akurasi Statistik Rekap Nilai',
        description: 'Statistik rata-rata kelas dan chart sebaran kini otomatis mengabaikan siswa yang essay-nya belum dikoreksi demi keakuratan data.',
        icon: Activity,
        colorClass: 'text-rose-500 bg-rose-50',
      }
    ]
  }

  return []
})

const tutorialSlides = computed(() => {
  if (props.role === 'guru') {
    return [
      {
        title: 'Buka Pratinjau POV Siswa',
        description: 'Klik tombol mata "Preview POV Siswa" di baris Jadwal Ujian atau bagian header halaman Rekap Nilai.',
        icon: Eye,
        color: 'text-amber-600',
        bg: 'bg-amber-50'
      },
      {
        title: 'Simulasi Pengerjaan Interaktif',
        description: 'Coba pilih opsi jawaban, centang PG Kompleks, atau ketik jawaban essay. Semuanya disimulasikan secara lokal.',
        icon: PenTool,
        color: 'text-primary-600',
        bg: 'bg-primary-50'
      },
      {
        title: 'Tenang, 100% Aman!',
        description: 'Banner kuning di atas soal menegaskan seluruh aktivitas preview ini hanya simulasi dan tidak akan masuk ke database.',
        icon: Sparkles,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50'
      },
      {
        title: 'Breakdown Nilai Rinci',
        description: 'Periksa detail pecahan nilai PG + Essay serta statistik grafik sebaran kelas yang telah disempurnakan akurasinya.',
        icon: CheckCircle,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50'
      }
    ]
  }

  if (props.role === 'admin') {
    return [
      {
        title: 'Akses Menu Pengaturan',
        description: 'Buka menu Pengaturan di sidebar kiri panel admin untuk mengonfigurasi parameter sistem.',
        icon: Settings,
        color: 'text-amber-600',
        bg: 'bg-amber-50'
      },
      {
        title: 'Atur Bobot Khusus Kelas',
        description: 'Gunakan form overrides untuk menentukan nilai maksimum PG per kelas jika berbeda dengan settingan default global.',
        icon: PlusCircle,
        color: 'text-primary-600',
        bg: 'bg-primary-50'
      },
      {
        title: 'Jalankan Audit Cerdas',
        description: 'Tekan tombol Scan Audit Nilai. Sistem akan mendeteksi inkonsistensi nilai berdasarkan bobot adaptif yang baru saja Anda set.',
        icon: MonitorCheck,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50'
      }
    ]
  }

  return []
})

const roleGreeting = computed(() => {
  if (props.role === 'admin') {
    return 'Halo Administrator! Kami telah merilis fitur pengaturan rumus penilaian per jenjang kelas secara dinamis serta sistem audit kelayakan nilai yang adaptif khusus untuk Anda.'
  }
  if (props.role === 'guru') {
    return 'Halo Rekan Pengajar! Kami baru saja merilis simulator POV ujian siswa interaktif dan rincian breakdown nilai hasil ujian untuk mempermudah pemantauan Anda.'
  }
  return 'Halo! Kami baru saja merilis beberapa fitur baru untuk membuat pengalaman Anda menggunakan CBT ATS menjadi lebih baik dan efisien.'
})

const versionSubtitle = computed(() => {
  if (props.role === 'admin') {
    return 'Pembaruan Panel Admin (v1.3)'
  }
  if (props.role === 'guru') {
    return 'Pembaruan Panel Pengajar (v1.3)'
  }
  return 'Pembaruan Fitur v1.3'
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isVisible && updates.length > 0"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-venus-900/40 backdrop-blur-sm transition-opacity duration-300"
        @click="closeModal"
      ></div>

      <!-- Modal Content -->
      <!-- Modal Content Card -->
      <div 
        class="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-venus-200/50 flex flex-col max-h-[85vh] md:max-h-[90vh] overflow-hidden animate-fade-in-up"
      >
        <!-- Header (Fixed) -->
        <div class="relative overflow-hidden bg-gradient-to-br from-primary-50 to-white px-6 py-5 sm:px-8 border-b border-venus-100/40 shrink-0">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary-100/50 blur-2xl"></div>
          <div class="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-blue-100/50 blur-2xl"></div>
          
          <div class="relative flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 shadow-ios-sm">
                <Sparkles :size="20" stroke-width="2.5" />
              </div>
              <div>
                <h2 class="text-lg font-bold tracking-tight text-venus-900">Apa yang Baru?</h2>
                <p class="text-xs font-semibold text-venus-500">{{ versionSubtitle }}</p>
              </div>
            </div>
            <button 
              @click="closeModal"
              class="pressable-soft rounded-full bg-white p-2 text-venus-400 shadow-sm ring-1 ring-venus-100 transition-colors hover:text-venus-600"
            >
              <X :size="16" />
            </button>
          </div>
        </div>

        <!-- Body & Footer (Conditional) -->
        <template v-if="viewMode === 'updates'">
          <!-- Scrollable Body Content -->
          <div class="flex-1 overflow-y-auto px-6 py-5 sm:px-8 space-y-5 bg-slate-50/20 custom-scrollbar">
            <p class="text-xs sm:text-sm leading-relaxed text-venus-600">
              {{ roleGreeting }}
            </p>

            <div class="space-y-3.5">
              <div 
                v-for="update in updates" 
                :key="update.id"
                class="flex gap-4 rounded-2xl border border-venus-100/40 bg-white p-4 shadow-sm transition-colors hover:bg-venus-50"
              >
                <div 
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  :class="update.colorClass"
                >
                  <component :is="update.icon" :size="20" stroke-width="2.5" />
                </div>
                <div>
                  <h3 class="text-xs sm:text-sm font-bold text-venus-900">{{ update.title }}</h3>
                  <p class="mt-1 text-[11px] sm:text-xs leading-relaxed text-venus-500">{{ update.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Fixed Footer -->
          <div class="shrink-0 p-5 sm:p-6 border-t border-venus-100/50 bg-white flex flex-col gap-2.5">
            <PrimaryButton 
              v-if="tutorialSlides.length > 0"
              class="w-full justify-center shadow-primary-500/25 py-2.5 text-xs sm:text-sm font-semibold" 
              @click="viewMode = 'tutorial'"
            >
              Lihat Tutorial Penggunaan
              <ChevronRight :size="16" class="ml-1.5 opacity-80" />
            </PrimaryButton>
            <button 
              class="w-full text-center py-1.5 text-[11px] sm:text-xs font-bold text-venus-400 hover:text-primary-600 transition-colors"
              @click="closeModal"
            >
              Lewati & Tutup
            </button>
          </div>
        </template>

        <template v-else-if="viewMode === 'tutorial'">
          <!-- Scrollable Body Content (Tutorial Slide) -->
          <div class="flex-1 overflow-y-auto px-6 py-6 sm:px-8 bg-slate-50/20 custom-scrollbar flex flex-col justify-center min-h-[300px]">
            <div class="relative h-[250px]">
              <transition-group name="slide-fade">
                <div 
                  v-for="(slide, index) in tutorialSlides" 
                  :key="index"
                  v-show="currentSlide === index"
                  class="absolute inset-0 flex flex-col items-center text-center py-2"
                >
                  <div 
                    class="flex h-20 w-20 items-center justify-center rounded-[28px] mb-4 shadow-sm animate-float"
                    :class="[slide.color, slide.bg]"
                  >
                    <component :is="slide.icon" :size="38" stroke-width="2" />
                  </div>
                  <h3 class="text-base font-bold text-venus-900 mb-1.5">{{ slide.title }}</h3>
                  <p class="text-xs text-venus-500 leading-relaxed max-w-[280px] mx-auto">{{ slide.description }}</p>
                </div>
              </transition-group>
            </div>

            <!-- Pagination dots -->
            <div class="flex justify-center gap-1.5 mt-2">
              <div 
                v-for="(_, i) in tutorialSlides" 
                :key="i"
                class="h-1.5 rounded-full transition-all duration-300"
                :class="currentSlide === i ? 'w-5 bg-primary-500' : 'w-1.5 bg-venus-100'"
              ></div>
            </div>
          </div>

          <!-- Fixed Footer (Tutorial Slide) -->
          <div class="shrink-0 p-5 sm:p-6 border-t border-venus-100/50 bg-white flex items-center gap-3">
            <button 
              v-if="currentSlide > 0"
              @click="prevSlide"
              class="pressable-soft flex h-10 w-10 items-center justify-center rounded-xl bg-venus-50 text-venus-500 transition-colors hover:bg-venus-100"
            >
              <ChevronLeft :size="18" />
            </button>
            <PrimaryButton class="flex-1 justify-center py-2.5 text-xs sm:text-sm font-semibold" @click="nextSlide">
              {{ currentSlide === tutorialSlides.length - 1 ? 'Selesai & Mulai' : 'Lanjut' }}
              <ChevronRight v-if="currentSlide < tutorialSlides.length - 1" :size="16" class="ml-1.5" />
              <CheckCircle v-else :size="16" class="ml-1.5" />
            </PrimaryButton>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-float { animation: float 3s ease-in-out infinite; }

/* Slide transition */
.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
