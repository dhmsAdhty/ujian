<script setup>
import { useActivityFeed } from '@/composables/useActivityFeed'
import { GlassCard } from '@/components/ui'
import { User, FileText, Clock } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'

const { activities, loading } = useActivityFeed()

const getIcon = (type) => {
  if (type === 'login') return User
  if (type === 'soal') return FileText
  return Clock
}

const getColorClass = (type) => {
  if (type === 'login') return 'bg-sky-100 text-sky-700'
  if (type === 'soal') return 'bg-primary-100 text-primary-700'
  return 'bg-zinc-100 text-zinc-600'
}
</script>

<template>
  <GlassCard>
    <div class="mb-5 flex items-center justify-between gap-3">
      <h3 class="text-lg font-semibold tracking-tight text-zinc-900">Aktivitas terkini</h3>
      <span
        class="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100"
      >
        Live
      </span>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-14 animate-pulse rounded-lg bg-zinc-100" />
    </div>

    <div v-else-if="activities.length === 0" class="py-8 text-center text-sm text-zinc-500">
      Belum ada aktivitas tercatat.
    </div>

    <div v-else class="relative space-y-5">
      <div class="absolute top-2 bottom-2 left-[19px] w-px bg-zinc-100" aria-hidden="true" />

      <div
        v-for="activity in activities"
        :key="activity.id"
        class="relative flex animate-fade-in items-start gap-3"
      >
        <div
          class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white"
          :class="getColorClass(activity.type)"
        >
          <component :is="getIcon(activity.type)" :size="18" stroke-width="2" />
        </div>

        <div class="min-w-0 flex-1 pt-0.5">
          <div class="flex items-start justify-between gap-2">
            <h4 class="truncate text-sm font-medium text-zinc-900">{{ activity.title }}</h4>
            <time
              class="shrink-0 text-[11px] tabular-nums text-zinc-400"
              :datetime="activity.time"
            >
              {{ formatDistanceToNow(new Date(activity.time), { addSuffix: true }) }}
            </time>
          </div>
          <p class="mt-0.5 line-clamp-2 text-sm text-zinc-500">{{ activity.description }}</p>
        </div>
      </div>
    </div>
  </GlassCard>
</template>
