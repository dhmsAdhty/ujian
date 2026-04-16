import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/services/supabase'

export function useActivityFeed() {
  const activities = ref([])
  const loading = ref(true)

  async function fetchInitialActivities() {
    // Combine recent profiles and recent bank_soal updates
    const [profiles, soal] = await Promise.all([
      supabase.from('profiles').select('id, full_name, last_login').order('last_login', { ascending: false }).limit(5),
      supabase.from('bank_soal').select('id, judul, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(5)
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
        description: `${s.profiles?.full_name || 'Seorang Guru'} membuat soal: ${s.judul}`,
        time: s.created_at
      }))
    ]

    activities.value = combined.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
    loading.value = false
  }

  let pollInterval

  onMounted(() => {
    fetchInitialActivities()
    
    pollInterval = setInterval(fetchInitialActivities, 15000)

    onUnmounted(() => {
      clearInterval(pollInterval)
    })
  })

  return { activities, loading }
}
