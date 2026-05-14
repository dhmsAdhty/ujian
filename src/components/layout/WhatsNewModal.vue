<script setup>
import { ref, onMounted, computed } from 'vue'
import { Sparkles, X, CheckCircle, Trash2, Activity, PlusCircle, PenTool, ShieldAlert, MonitorCheck } from 'lucide-vue-next'
import { PrimaryButton } from '@/components/ui'

const props = defineProps({
  role: {
    type: String,
    required: true
  }
})

const isVisible = ref(false)
const VERSION_KEY = 'cbt_ats_whatsnew_v1.2' // Updated to show new Monitoring & Stability features

onMounted(() => {
  const hasSeen = localStorage.getItem(VERSION_KEY)
  if (!hasSeen) {
    // Small delay for animation effect after layout loads
    setTimeout(() => {
      isVisible.value = true
    }, 500)
  }
})

const closeModal = () => {
  isVisible.value = false
  localStorage.setItem(VERSION_KEY, 'true')
}

const updates = computed(() => {
  if (props.role === 'admin') {
    return [
      {
        id: 1,
        title: 'Sistem Monitor Error (Error Logger)',
        description: 'Pantau error aplikasi secara real-time dari Dashboard Admin. Lacak sumber masalah dengan lebih mudah dan cepat.',
        icon: Activity,
        colorClass: 'text-rose-500 bg-rose-50',
      },
      {
        id: 2,
        title: 'Hapus Akun Massal (Bulk Delete)',
        description: 'Kini Anda dapat memilih banyak pengguna sekaligus dan menghapusnya dalam satu klik. Lebih efisien mengelola data siswa dan guru.',
        icon: Trash2,
        colorClass: 'text-amber-500 bg-amber-50',
      },
      {
        id: 3,
        title: 'Stabilitas Log Error',
        description: 'Perbaikan pada sistem monitoring yang kini menyaring error sampah "Document not active", sehingga log Anda lebih bersih dan akurat.',
        icon: MonitorCheck,
        colorClass: 'text-indigo-500 bg-indigo-50',
      }
    ]
  }
  
  if (props.role === 'guru') {
    return [
      {
        id: 1,
        title: 'Tombol Simpan & Tambah Lagi',
        description: 'Input soal satu per satu tanpa harus keluar masuk form! Form akan otomatis dibersihkan dan siap untuk soal berikutnya setelah disimpan.',
        icon: PlusCircle,
        colorClass: 'text-emerald-500 bg-emerald-50',
      },
      {
        id: 2,
        title: 'Live Counter Jumlah Soal',
        description: 'Ketahui langsung berapa banyak soal yang sudah Anda buat untuk Mata Pelajaran dan Kelas tertentu langsung dari form pembuatan soal.',
        icon: PenTool,
        colorClass: 'text-blue-500 bg-blue-50',
      },
      {
        id: 3,
        title: 'Monitoring Pelanggaran Baru',
        description: 'Pantau kejujuran siswa dan progres pengerjaan soal secara real-time melalui menu Monitoring yang baru ditambahkan.',
        icon: ShieldAlert,
        colorClass: 'text-rose-500 bg-rose-50',
      }
    ]
  }

  if (props.role === 'siswa') {
    return [
      {
        id: 1,
        title: 'Status Waktu Ujian Akurat',
        description: 'Ujian sekarang memiliki penanda status waktu yang lebih jelas (Belum Mulai, Berlangsung, Berakhir) agar kamu tidak salah jadwal.',
        icon: Activity,
        colorClass: 'text-purple-500 bg-purple-50',
      },
      {
        id: 2,
        title: 'Tampilan Analitik Nilai Baru',
        description: 'Melihat riwayat hasil ujian dan nilai kamu sekarang jadi lebih seru dengan antarmuka statistik dan grafik yang baru!',
        icon: Sparkles,
        colorClass: 'text-amber-500 bg-amber-50',
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

        <!-- Body -->
        <div class="px-6 pb-8 pt-4 sm:px-8">
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
          <div class="mt-8">
            <PrimaryButton class="w-full justify-center shadow-primary-500/25 py-3" @click="closeModal">
              Tutup & Lanjutkan
              <CheckCircle :size="18" class="ml-2 opacity-80" />
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
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
