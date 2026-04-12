import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/services/supabase'

export function useActivityFeed() {
  const activities = ref([])
  const loading = ref(true)

  async function fetchInitialActivities() {
    // Combine recent profiles and recent bank_soal updates
    const [profiles, soal] = await Promise.all([
      supabase.from('profiles').select('id, full_name, last_login').order('last_login', { ascending: false }).limit(5),
      supabase.from('bank_soal').select('id, judul, created_at, gurus(full_name)').order('created_at', { ascending: false }).limit(5)
    ])

    const combined = [
      ...(profiles.data || []).map(p => ({
        id: `login-${p.id}-${p.last_login}`,
        type: 'login',
        title: 'User Login',
        description: `${p.full_name} baru saja masuk ke sistem.`,
        time: p.last_login
      })),
      ...(soal.data || []).map(s => ({
        id: `soal-${s.id}`,
        type: 'soal',
        title: 'Soal Baru',
        description: `${s.gurus?.full_name || 'Seorang Guru'} membuat soal: ${s.judul}`,
        time: s.created_at
      }))
    ]

    activities.value = combined.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
    loading.value = false
  }

  onMounted(() => {
    fetchInitialActivities()

    const channel = supabase.channel('realtime_activities')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new.last_login !== payload.old.last_login) {
          activities.value.unshift({
            id: `login-${payload.new.id}-${Date.now()}`,
            type: 'login',
            title: 'User Login',
            description: `${payload.new.full_name} baru saja masuk ke sistem.`,
            time: payload.new.last_login
          })
          activities.value = activities.value.slice(0, 10)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bank_soal' }, (payload) => {
        activities.value.unshift({
          id: `soal-${payload.new.id}`,
          type: 'soal',
          title: 'Soal Baru',
          description: `Soal baru telah ditambahkan ke bank soal.`,
          time: payload.new.created_at
        })
        activities.value = activities.value.slice(0, 10)
      })
      .subscribe()

    onUnmounted(() => {
      supabase.removeChannel(channel)
    })
  })

  return { activities, loading }
}
