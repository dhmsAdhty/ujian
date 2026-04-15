<script setup>
import { ref, onMounted } from 'vue'
import { Users, FileStack, BookOpen, Activity } from 'lucide-vue-next'
import { supabase } from '@/services/supabase'
import StatCard from '@/components/admin/StatCard.vue'
import ActivityFeed from '@/components/admin/ActivityFeed.vue'
import DistributionChart from '@/components/admin/DistributionChart.vue'
import { GlassCard } from '@/components/ui'
import { useRouter } from 'vue-router'

const router = useRouter()

const stats = ref([
  { title: 'Total Siswa', value: '0', icon: Users, color: 'primary', trend: null },
  { title: 'Bank Soal', value: '0', icon: FileStack, color: 'orange', trend: null },
  { title: 'Mata Pelajaran', value: '0', icon: BookOpen, color: 'blue' },
  { title: 'Ujian Aktif', value: '0', icon: Activity, color: 'emerald' }
])

const activeExams = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const now = new Date().toISOString()
    
    // Fetch counts
    const [
      { count: siswaCount },
      { count: soalCount },
      { count: mapelCount },
      { count: ujianAktifCount }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'siswa'),
      supabase.from('bank_soal').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('mapel').select('*', { count: 'exact', head: true }),
      supabase.from('ujian').select('*', { count: 'exact', head: true })
        .lte('tanggal_mulai', now)
        .gte('tanggal_selesai', now)
    ])

    stats.value[0].value = (siswaCount || 0).toLocaleString()
    stats.value[1].value = (soalCount || 0).toLocaleString()
    stats.value[2].value = (mapelCount || 0).toLocaleString()
    stats.value[3].value = (ujianAktifCount || 0).toLocaleString()

    // Fetch active exams for table
    const { data: examsData } = await supabase
      .from('ujian')
      .select(`
        id, nama, tanggal_mulai, tanggal_selesai,
        mapel (nama),
        kelas (nama)
      `)
      .lte('tanggal_mulai', now)
      .gte('tanggal_selesai', now)
      .order('tanggal_selesai', { ascending: true })
      .limit(5)

    activeExams.value = examsData || []

  } catch (error) {
    console.error('Failed to fetch dashboard stats', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="animate-fade-in space-y-8">
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-venus-900">Ringkasan</h1>
        <p class="mt-1 text-sm text-venus-500">Performa sistem dan aktivitas akademik.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          @click="router.push('/admin/aktivitas')"
          class="pressable-soft rounded-xl border border-venus-200/90 bg-white px-4 py-2 text-sm font-medium text-venus-800 shadow-ios-sm transition-[background-color,transform] duration-200 ease-ios active:bg-venus-100"
        >
          Aktivitas Pengguna
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
      <StatCard 
        v-for="stat in stats" 
        :key="stat.title"
        v-bind="stat"
      />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
      <div class="space-y-6 lg:col-span-2">
        <DistributionChart />

        <GlassCard padding="p-6">
          <div class="mb-5 flex items-center justify-between gap-3">
            <h3 class="text-lg font-semibold tracking-tight text-venus-900">Ujian berlangsung</h3>
            <button
              type="button"
              class="rounded-lg px-1 py-0.5 text-sm font-medium text-primary-600 transition-opacity active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500/30"
            >
              Lihat semua
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-venus-100 text-left text-xs font-medium text-venus-500">
                  <th class="pb-3 pl-1">Mata pelajaran</th>
                  <th class="pb-3">Kelas</th>
                  <th class="pb-3">Progress</th>
                  <th class="pb-3 pr-1 text-right">Status</th>
                </tr>
              </thead>
              <tbody v-if="loading">
                <tr v-for="i in 3" :key="i">
                  <td colspan="4" class="py-3 px-1">
                    <div class="h-10 animate-pulse bg-venus-100 rounded-lg w-full"></div>
                  </td>
                </tr>
              </tbody>
              <tbody v-else-if="activeExams.length === 0">
                <tr>
                  <td colspan="4" class="py-10 text-center text-sm text-venus-500">
                    Tidak ada ujian yang sedang berlangsung
                  </td>
                </tr>
              </tbody>
              <tbody v-else class="divide-y divide-venus-100">
                <tr v-for="exam in activeExams" :key="exam.id">
                  <td class="py-3 pl-1">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-8 w-8 items-center justify-center rounded-md bg-primary-100 text-xs font-semibold text-primary-800 uppercase"
                      >
                        {{ exam.mapel?.nama?.slice(0,3) || 'UJN' }}
                      </div>
                      <span class="font-medium text-venus-800">{{ exam.ujian?.nama || exam.mapel?.nama || 'Ujian' }}</span>
                    </div>
                  </td>
                  <td class="py-3 text-venus-600">{{ exam.kelas?.nama || 'Semua Kelas' }}</td>
                  <td class="py-3">
                    <div class="flex w-40 max-w-full items-center gap-2">
                       <span class="text-xs text-venus-500">Batas: {{ new Date(exam.tanggal_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}</span>
                    </div>
                  </td>
                  <td class="py-3 pr-1 text-right">
                    <span
                      class="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100"
                    >
                      Live
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <div class="lg:col-span-1">
        <ActivityFeed />
      </div>
    </div>
  </div>
</template>
