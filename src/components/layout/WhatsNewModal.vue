<script setup>
import { ref, onMounted, computed } from 'vue'
import { Sparkles, X, CheckCircle, Trash2, Activity, PlusCircle, PenTool, ShieldAlert, MonitorCheck, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-vue-next'
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
const VERSION_KEY = 'cbt_ats_whatsnew_v1.2'

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
        id: 3,
        title: 'Stabilitas Log Error',
        description: 'Pembersihan log otomatis untuk error "Document not active", membuat dashboard monitor Anda lebih bersih dan akurat.',
        icon: MonitorCheck,
        colorClass: 'text-indigo-500 bg-indigo-50',
      }
    ]
  }
  
  if (props.role === 'guru') {
    return [
      {
        id: 3,
        title: 'Monitoring Pelanggaran Baru',
        description: 'Pantau kejujuran siswa dan progres pengerjaan soal secara real-time melalui menu Monitoring baru di sidebar.',
        icon: ShieldAlert,
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
        title: 'Akses Menu Monitoring',
        description: 'Buka menu Monitoring di sidebar kiri untuk melihat dashboard integritas siswa.',
        icon: ShieldAlert,
        color: 'text-primary-600',
        bg: 'bg-primary-50'
      },
      {
        title: 'Pantau Pelanggaran',
        description: 'Sistem otomatis mencatat setiap kali siswa keluar dari tab atau layar ujian.',
        icon: Activity,
        color: 'text-rose-600',
        bg: 'bg-rose-50'
      },
      {
        title: 'Cek Progres Pengerjaan',
        description: 'Lihat jumlah soal yang sudah dijawab siswa secara real-time tanpa harus menunggu selesai.',
        icon: CheckCircle,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50'
      },
      {
        title: 'Tindak Lanjut & Reset',
        description: 'Gunakan tombol Reset jika ingin memberikan toleransi atau kesempatan kedua bagi siswa.',
        icon: RotateCcw,
        color: 'text-amber-600',
        bg: 'bg-amber-50'
      }
    ]
  }
  return []
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
      <div 
        class="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-venus-200/50 animate-fade-in-up"
      >
        <!-- Header -->
        <div class="relative overflow-hidden bg-gradient-to-br from-primary-50 to-white px-6 py-8 sm:px-8">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary-100/50 blur-2xl"></div>
          <div class="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-blue-100/50 blur-2xl"></div>
          
          <div class="relative flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 shadow-ios-sm">
                <Sparkles :size="24" stroke-width="2.5" />
              </div>
              <div>
                <h2 class="text-xl font-bold tracking-tight text-venus-900">Apa yang Baru?</h2>
                <p class="text-sm font-medium text-venus-500">Pembaruan fitur versi 1.2</p>
              </div>
            </div>
            <button 
              @click="closeModal"
              class="pressable-soft rounded-full bg-white p-2 text-venus-400 shadow-sm ring-1 ring-venus-100 transition-colors hover:text-venus-600"
            >
              <X :size="18" />
            </button>
          </div>
        </div>

        <!-- Body: Updates List -->
        <div v-if="viewMode === 'updates'" class="px-6 pb-8 pt-4 sm:px-8">
          <p class="mb-6 text-sm leading-relaxed text-venus-600">
            Halo! Kami baru saja merilis beberapa fitur baru untuk membuat pengalaman Anda menggunakan CBT ATS menjadi lebih baik dan efisien.
          </p>

          <div class="space-y-4">
            <div 
              v-for="update in updates" 
              :key="update.id"
              class="flex gap-4 rounded-2xl border border-venus-100/60 bg-venus-50/30 p-4 transition-colors hover:bg-venus-50"
            >
              <div 
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                :class="update.colorClass"
              >
                <component :is="update.icon" :size="20" stroke-width="2.5" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-venus-900">{{ update.title }}</h3>
                <p class="mt-1 text-xs leading-relaxed text-venus-500">{{ update.description }}</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="mt-8 flex flex-col gap-3">
            <PrimaryButton 
              v-if="tutorialSlides.length > 0"
              class="w-full justify-center shadow-primary-500/25 py-3" 
              @click="viewMode = 'tutorial'"
            >
              Lihat Tutorial Penggunaan
              <ChevronRight :size="18" class="ml-2 opacity-80" />
            </PrimaryButton>
            <button 
              class="w-full text-center py-2 text-xs font-semibold text-venus-400 hover:text-primary-600 transition-colors"
              @click="closeModal"
            >
              Lewati & Tutup
            </button>
          </div>
        </div>

        <!-- Body: Tutorial Carousel -->
        <div v-else-if="viewMode === 'tutorial'" class="px-6 pb-8 pt-4 sm:px-8 overflow-hidden">
          <div class="relative h-[280px]">
            <transition-group name="slide-fade">
              <div 
                v-for="(slide, index) in tutorialSlides" 
                :key="index"
                v-show="currentSlide === index"
                class="absolute inset-0 flex flex-col items-center text-center py-4"
              >
                <div 
                  class="flex h-24 w-24 items-center justify-center rounded-[32px] mb-6 animate-float"
                  :class="[slide.color, slide.bg]"
                >
                  <component :is="slide.icon" :size="48" stroke-width="2" />
                </div>
                <h3 class="text-lg font-bold text-venus-900 mb-2">{{ slide.title }}</h3>
                <p class="text-sm text-venus-500 leading-relaxed">{{ slide.description }}</p>
              </div>
            </transition-group>
          </div>

          <!-- Pagination dots -->
          <div class="flex justify-center gap-1.5 mb-8">
            <div 
              v-for="(_, i) in tutorialSlides" 
              :key="i"
              class="h-1.5 rounded-full transition-all duration-300"
              :class="currentSlide === i ? 'w-6 bg-primary-500' : 'w-1.5 bg-venus-100'"
            ></div>
          </div>

          <!-- Footer Navigation -->
          <div class="flex items-center gap-3">
            <button 
              v-if="currentSlide > 0"
              @click="prevSlide"
              class="pressable-soft flex h-11 w-11 items-center justify-center rounded-xl bg-venus-50 text-venus-500 transition-colors hover:bg-venus-100"
            >
              <ChevronLeft :size="20" />
            </button>
            <PrimaryButton class="flex-1 justify-center py-3" @click="nextSlide">
              {{ currentSlide === tutorialSlides.length - 1 ? 'Selesai & Mulai' : 'Lanjut' }}
              <ChevronRight v-if="currentSlide < tutorialSlides.length - 1" :size="18" class="ml-2" />
              <CheckCircle v-else :size="18" class="ml-2" />
            </PrimaryButton>
          </div>
        </div>
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
