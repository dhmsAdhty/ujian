<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { supabase } from '@/services/supabase'
import { GlassCard, PrimaryButton } from '@/components/ui'
import { Search, Activity, LogIn, MonitorPlay, ArrowRight, RefreshCw, Cpu, Globe } from 'lucide-vue-next'

const loading = ref(true)
const activities = ref([])
const searchQuery = ref('')
const filterType = ref('all') // 'all', 'login', 'ujian'

const fetchActivities = async () => {
  loading.value = true
  try {
    // Ambil data login terakhir dari user (50 teratas)
    const { data: logins } = await supabase
      .from('profiles')
      .select('id, full_name, role, last_login')
      .not('last_login', 'is', null)
      .order('last_login', { ascending: false })
      .limit(50)

    // Ambil data siswa yang sedang mengerjakan atau baru selesai ujian
    const { data: exams } = await supabase
      .from('exam_results')
      .select('id, start_time, submitted_at, profiles(full_name), ujian(nama)')
      .order('start_time', { ascending: false })
      .limit(50)

    const mappedLogins = (logins || []).map(l => ({
      id: `login-${l.id}`,
      type: 'login',
      user: l.full_name,
      role: l.role,
      action: 'Login ke sistem',
      details: 'Aktivitas masuk',
      time: l.last_login,
      // IP/Device mock/placeholder since no db alteration allows this out-of-the-box easily
      ip: 'N/A (Sistem bawaan)',
      device: 'Browser (Unknown)' 
    }))

    const mappedExams = (exams || []).map(e => ({
      id: `exam-${e.id}`,
      type: e.submitted_at ? 'ujian_selesai' : 'ujian_aktif',
      user: e.profiles?.full_name || 'Siswa',
      role: 'siswa',
      action: e.submitted_at ? 'Menyelesaikan Ujian' : 'Sedang Mengerjakan Ujian',
      details: e.ujian?.nama || 'Ujian tidak diketahui',
      time: e.submitted_at ? e.submitted_at : e.start_time,
      ip: 'N/A (Sistem bawaan)',
      device: 'CBT Engine'
    }))

    // Gabungkan, urutkan terbaru, limit 50
    activities.value = [...mappedLogins, ...mappedExams]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 50)

  } catch (error) {
    console.error('Error fetching activities:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchActivities()
  
  // Realtime subscription (opsional, jika ingin list terupdate otomatis saat ada orang start exam / update timestamp)
  const channel = supabase.channel('activity-logs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
       // Debounced fetch
       setTimeout(fetchActivities, 1000)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_results' }, () => {
       setTimeout(fetchActivities, 1000)
    })
    .subscribe()

  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

const filteredActivities = computed(() => {
  return activities.value.filter(a => {
    const matchSearch = a.user.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                        a.details.toLowerCase().includes(searchQuery.value.toLowerCase())
    if (!matchSearch) return false
    
    if (filterType.value === 'login' && a.type !== 'login') return false
    if (filterType.value === 'ujian' && !a.type.startsWith('ujian')) return false
    return true
  })
})

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString('id-ID', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

const timeAgo = (timeStr) => {
  if (!timeStr) return ''
  const diff = Math.max(0, Date.now() - new Date(timeStr).getTime())
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'Baru saja'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} menit lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  const d = Math.floor(hr / 24)
  return `${d} hari yang lalu`
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-venus-900">Aktivitas Pengguna</h1>
        <p class="mt-1 text-sm text-venus-400">Log real-time login dan pengerjaan ujian (50 aktivitas terakhir).</p>
      </div>
      <div>
        <button
          @click="fetchActivities"
          class="inline-flex items-center gap-2 pressable-soft px-4 py-2 rounded-xl bg-white border border-venus-200 text-sm font-semibold text-venus-700 shadow-ios-sm hover:text-primary-600 transition-colors"
        >
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-venus-400" :size="18" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama pengguna atau detail ujian..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-venus-200 rounded-xl text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
        />
      </div>
      <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          @click="filterType = 'all'"
          class="whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-colors border"
          :class="filterType === 'all' ? 'bg-venus-800 text-white border-transparent' : 'bg-white text-venus-600 border-venus-200 hover:bg-venus-50'"
        >Semua</button>
        <button
          @click="filterType = 'login'"
          class="whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-colors border"
          :class="filterType === 'login' ? 'bg-sky-500 text-white border-transparent' : 'bg-white text-sky-600 border-sky-200 hover:bg-sky-50'"
        >Login Saja</button>
        <button
          @click="filterType = 'ujian'"
          class="whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg transition-colors border"
          :class="filterType === 'ujian' ? 'bg-primary-500 text-white border-transparent' : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50'"
        >Aktifitas Ujian</button>
      </div>
    </div>

    <!-- Feeds List -->
    <GlassCard padding="p-0" class="overflow-hidden">
      <div v-if="loading && activities.length === 0" class="p-6 space-y-4">
        <div v-for="i in 5" :key="i" class="flex gap-4 p-4 border animate-pulse border-venus-100 rounded-xl bg-venus-50/50">
          <div class="w-10 h-10 bg-venus-200 rounded-full shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="w-1/3 h-4 bg-venus-200 rounded"></div>
            <div class="w-1/2 h-3 bg-venus-200 rounded"></div>
          </div>
        </div>
      </div>
      
      <div v-else-if="filteredActivities.length === 0" class="p-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-venus-50 text-venus-300 flex items-center justify-center rounded-full mb-4">
          <Activity :size="32" />
        </div>
        <h3 class="text-base font-bold text-venus-700">Tidak Ada Aktivitas</h3>
        <p class="text-sm text-venus-400 mt-1 max-w-sm">Belum ada rekaman aktivitas yang sesuai dengan pencarian atau saat ini sistem sedang kosong.</p>
      </div>

      <div v-else class="divide-y divide-venus-100">
        <div v-for="act in filteredActivities" :key="act.id" class="p-4 sm:px-6 sm:py-4 flex gap-4 items-start sm:items-center hover:bg-venus-50/50 transition-colors group">
          <!-- Icon -->
          <div class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            :class="{
              'bg-sky-100 text-sky-600': act.type === 'login',
              'bg-primary-100 text-primary-600': act.type === 'ujian_aktif',
              'bg-emerald-100 text-emerald-600': act.type === 'ujian_selesai'
            }">
            <LogIn v-if="act.type === 'login'" :size="18" />
            <Activity v-else-if="act.type === 'ujian_aktif'" :size="18" />
            <MonitorPlay v-else :size="18" />
          </div>

          <!-- Main Content -->
          <div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-0.5">
                <span class="font-bold text-venus-900 truncate">{{ act.user }}</span>
                <span class="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                  :class="{
                    'bg-amber-100 text-amber-700': act.role === 'guru',
                    'bg-emerald-100 text-emerald-700': act.role === 'admin',
                    'bg-slate-100 text-slate-500': act.role === 'siswa'
                  }">
                  {{ act.role }}
                </span>
                <span class="text-[11px] font-bold text-sky-600 sm:hidden">
                  {{ timeAgo(act.time) }}
                </span>
                <span class="text-[11px] font-medium text-venus-400 opacity-60 sm:hidden">
                  · {{ formatTime(act.time) }}
                </span>
              </div>
              <p class="text-sm text-venus-600">
                <span class="font-medium" 
                  :class="{'text-sky-700': act.type === 'login', 'text-primary-700': act.type==='ujian_aktif', 'text-emerald-700': act.type==='ujian_selesai'}">
                  {{ act.action }}
                </span> 
                <span v-if="act.details" class="mx-1 text-venus-300"><ArrowRight :size="12" class="inline" /></span> 
                {{ act.details }}
              </p>
              
              <!-- Hardware/IP mock info display (per user request context) -->
              <div class="mt-1.5 flex items-center gap-3 text-[11px] text-venus-400">
                <div class="flex items-center gap-1"><Cpu :size="11"/> {{ act.device }}</div>
                <div class="flex items-center gap-1"><Globe :size="11"/> {{ act.ip }}</div>
              </div>
            </div>

            <!-- Time Desktop -->
            <div class="hidden sm:block text-right shrink-0">
              <p class="text-xs font-bold text-sky-600 mb-0.5">{{ timeAgo(act.time) }}</p>
              <p class="text-[11px] font-medium text-venus-400">{{ formatTime(act.time) }}</p>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  </div>
</template>
