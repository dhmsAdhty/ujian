<script setup>
import { Users, FileStack, BookOpen, Activity } from 'lucide-vue-next'
import StatCard from '@/components/admin/StatCard.vue'
import ActivityFeed from '@/components/admin/ActivityFeed.vue'
import DistributionChart from '@/components/admin/DistributionChart.vue'
import { GlassCard } from '@/components/ui'

// Mock counts for now, in real app these would be fetched from Supabase
const stats = [
  { title: 'Total Siswa', value: '1,240', icon: Users, color: 'primary', trend: '12%' },
  { title: 'Bank Soal', value: '856', icon: FileStack, color: 'orange', trend: '5%' },
  { title: 'Mata Pelajaran', value: '42', icon: BookOpen, color: 'blue' },
  { title: 'Ujian Aktif', value: '12', icon: Activity, color: 'emerald' }
]
</script>

<template>
  <div class="animate-fade-in space-y-8">
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Ringkasan</h1>
        <p class="mt-1 text-sm text-zinc-500">Performa sistem dan aktivitas akademik.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50"
        >
          Unduh laporan
        </button>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          Ujian baru
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
            <h3 class="text-lg font-semibold tracking-tight text-zinc-900">Ujian berlangsung</h3>
            <button
              type="button"
              class="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Lihat semua
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500">
                  <th class="pb-3 pl-1">Mata pelajaran</th>
                  <th class="pb-3">Kelas</th>
                  <th class="pb-3">Progress</th>
                  <th class="pb-3 pr-1 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-50">
                <tr v-for="i in 3" :key="i" class="transition-colors hover:bg-zinc-50/80">
                  <td class="py-3 pl-1">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-8 w-8 items-center justify-center rounded-md bg-primary-100 text-xs font-semibold text-primary-800"
                      >
                        MTK
                      </div>
                      <span class="font-medium text-zinc-800">Matematika Wajib</span>
                    </div>
                  </td>
                  <td class="py-3 text-zinc-600">XII MIPA 1, 2</td>
                  <td class="py-3">
                    <div class="flex w-40 max-w-full items-center gap-2">
                      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div class="h-full w-[75%] rounded-full bg-primary-500" />
                      </div>
                      <span class="text-xs tabular-nums text-zinc-500">75%</span>
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
