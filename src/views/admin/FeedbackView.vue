<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/services/supabase'
import { GlassCard, EmptyState } from '@/components/ui'
import { MessageSquarePlus, Search, RefreshCw, X, Lightbulb, Flame, Bug, MessageCircle, Trash2 } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const loading    = ref(true)
const feedbacks  = ref([])
const searchQuery = ref('')
const filterKategori = ref('all')
const selected   = ref(null) // untuk detail modal

const kategoriConfig = {
  saran:   { label: 'Saran',       icon: Lightbulb, bg: 'bg-sky-50',     text: 'text-sky-600',     badge: 'bg-sky-100 text-sky-700' },
  kritik:  { label: 'Kritik',      icon: Flame,     bg: 'bg-red-50',     text: 'text-red-500',     badge: 'bg-red-100 text-red-600' },
  bug:     { label: 'Laporan Bug', icon: Bug,       bg: 'bg-amber-50',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  lainnya: { label: 'Lainnya',     icon: MessageCircle, bg: 'bg-venus-50', text: 'text-venus-500', badge: 'bg-venus-100 text-venus-600' },
}

const fetchFeedbacks = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (!error) feedbacks.value = data || []
  loading.value = false
}

onMounted(fetchFeedbacks)

const filtered = computed(() => {
  let data = feedbacks.value
  if (filterKategori.value !== 'all') {
    data = data.filter(f => f.kategori === filterKategori.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    data = data.filter(f =>
      f.nama?.toLowerCase().includes(q) ||
      f.pesan?.toLowerCase().includes(q)
    )
  }
  return data
})

const stats = computed(() => ({
  total:   feedbacks.value.length,
  saran:   feedbacks.value.filter(f => f.kategori === 'saran').length,
  kritik:  feedbacks.value.filter(f => f.kategori === 'kritik').length,
  bug:     feedbacks.value.filter(f => f.kategori === 'bug').length,
  lainnya: feedbacks.value.filter(f => f.kategori === 'lainnya').length,
}))

const formatDate = (d) => new Date(d).toLocaleString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
})

const timeAgo = (d) => {
  const diff = Math.max(0, Date.now() - new Date(d).getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Baru saja'
  if (min < 60) return `${min} menit lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  return `${Math.floor(hr / 24)} hari lalu`
}

const deleteFeedback = async (id) => {
  const confirm = await Swal.fire({
    title: 'Hapus Masukan?',
    text: 'Masukan ini akan dihapus secara permanen.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#ef4444'
  })

  if (!confirm.isConfirmed) return

  loading.value = true
  const { error } = await supabase.from('feedback').delete().eq('id', id)
  if (error) {
    Swal.fire('Gagal', error.message, 'error')
    loading.value = false
    return
  }
  
  feedbacks.value = feedbacks.value.filter(f => f.id !== id)
  selected.value = null
  loading.value = false
  Swal.fire({ icon: 'success', title: 'Berhasil Dihapus', timer: 1200, showConfirmButton: false })
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900 flex items-center gap-2">
          <MessageSquarePlus class="text-primary-600" />
          Saran & Kritik
        </h1>
        <p class="mt-1 text-sm text-venus-400">Masukan dari pengguna sistem CBT ATS.</p>
      </div>
      <button
        @click="fetchFeedbacks"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-venus-200 text-sm font-semibold text-venus-700 shadow-ios-sm hover:text-primary-600 transition-colors"
      >
        <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
        Refresh
      </button>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <GlassCard padding="p-4" v-for="(count, key) in { saran: stats.saran, kritik: stats.kritik, bug: stats.bug, lainnya: stats.lainnya }" :key="key">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            :class="kategoriConfig[key].bg">
            <component :is="kategoriConfig[key].icon" :size="18" :class="kategoriConfig[key].text" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-venus-400">{{ kategoriConfig[key].label }}</p>
            <p class="text-xl font-bold text-venus-900">{{ count }}</p>
          </div>
        </div>
      </GlassCard>
    </div>

    <!-- Filter & Search -->
    <GlassCard padding="p-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <!-- Search -->
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" :size="16" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama atau isi pesan..."
            class="form-input pl-9 text-sm w-full"
          />
        </div>
        <!-- Kategori filter chips -->
        <div class="flex items-center gap-2 flex-wrap">
          <button
            @click="filterKategori = 'all'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            :class="filterKategori === 'all' ? 'bg-venus-800 text-white border-transparent' : 'bg-white text-venus-500 border-venus-200 hover:border-venus-300'"
          >Semua ({{ stats.total }})</button>
          <button
            v-for="(cfg, key) in kategoriConfig"
            :key="key"
            @click="filterKategori = key"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            :class="filterKategori === key ? `${cfg.bg} ${cfg.text} border-current` : 'bg-white text-venus-500 border-venus-200 hover:border-venus-300'"
          >{{ cfg.label }}</button>
        </div>
      </div>
    </GlassCard>

    <!-- List -->
    <GlassCard padding="p-0" class="overflow-hidden">

      <!-- Loading skeleton -->
      <div v-if="loading" class="divide-y divide-venus-50">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-6 py-4">
          <div class="w-9 h-9 rounded-xl bg-venus-100 animate-pulse shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-3.5 w-1/4 bg-venus-100 rounded-full animate-pulse" />
            <div class="h-3 w-2/3 bg-venus-100 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="filtered.length === 0" class="py-4">
        <EmptyState title="Tidak Ada Masukan" description="Belum ada saran atau kritik yang masuk." />
      </div>

      <!-- Data -->
      <div v-else class="divide-y divide-venus-50">
        <div
          v-for="fb in filtered"
          :key="fb.id"
          class="flex items-start gap-4 px-4 sm:px-6 py-4 hover:bg-venus-50/50 transition-colors cursor-pointer"
          @click="selected = fb"
        >
          <!-- Icon -->
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            :class="kategoriConfig[fb.kategori]?.bg"
          >
            <component
              :is="kategoriConfig[fb.kategori]?.icon"
              :size="17"
              :class="kategoriConfig[fb.kategori]?.text"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-0.5">
              <span class="font-semibold text-venus-900 text-sm">{{ fb.nama }}</span>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="kategoriConfig[fb.kategori]?.badge"
              >{{ kategoriConfig[fb.kategori]?.label }}</span>
            </div>
            <p class="text-sm text-venus-600 truncate">{{ fb.pesan }}</p>
          </div>

          <!-- Time -->
          <div class="hidden sm:flex flex-col justify-between items-end shrink-0 h-full">
            <div class="text-right">
              <p class="text-xs font-bold text-sky-600">{{ timeAgo(fb.created_at) }}</p>
              <p class="text-[11px] text-venus-400">{{ formatDate(fb.created_at) }}</p>
            </div>
            <button
              @click.stop="deleteFeedback(fb.id)"
              class="mt-1 text-venus-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
              title="Hapus masukan"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </div>
    </GlassCard>

    <!-- Detail Modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="selected"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        @click.self="selected = null"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div v-if="selected" class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-venus-100 overflow-hidden">
            <!-- Modal header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-venus-100">
              <div class="flex items-center gap-3">
                <div
                  class="w-9 h-9 rounded-xl flex items-center justify-center"
                  :class="kategoriConfig[selected.kategori]?.bg"
                >
                  <component :is="kategoriConfig[selected.kategori]?.icon" :size="18" :class="kategoriConfig[selected.kategori]?.text" />
                </div>
                <div>
                  <p class="font-bold text-venus-900 text-sm">{{ selected.nama }}</p>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    :class="kategoriConfig[selected.kategori]?.badge"
                  >{{ kategoriConfig[selected.kategori]?.label }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="deleteFeedback(selected.id)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                  title="Hapus"
                >
                  <Trash2 :size="16" />
                </button>
                <button
                  @click="selected = null"
                  class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-venus-100 text-venus-400 transition-colors"
                >
                  <X :size="16" />
                </button>
              </div>
            </div>

            <!-- Modal body -->
            <div class="px-6 py-5 space-y-4">
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-venus-400 mb-2">Pesan</p>
                <p class="text-sm text-venus-800 leading-relaxed whitespace-pre-wrap bg-venus-50 rounded-xl px-4 py-3">{{ selected.pesan }}</p>
              </div>
              <div class="flex items-center justify-between text-xs text-venus-400 pt-1">
                <span>{{ formatDate(selected.created_at) }}</span>
                <span class="font-semibold text-sky-600">{{ timeAgo(selected.created_at) }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

  </div>
</template>
