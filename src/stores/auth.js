import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => profile.value?.role || null)

  async function fetchProfile() {
    if (!user.value || profile.value) return // Return if profile exists in session/cache

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, kelas_id, avatar_url')
      .eq('id', user.value.id)
      .single()

    if (!error) {
      profile.value = data
    }
  }

  // Call once on app start to restore session from Supabase
  async function init() {
    if (initialized.value) return
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      user.value = data.session.user
      await fetchProfile()
    }
    initialized.value = true
  }

  async function login(email, password) {
    loading.value = true
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) {
      user.value = data.user
      // Only capture last login organically via explicitly logged-in behavior
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.value.id)
      await fetchProfile()
    }

    loading.value = false
    return { data, error }
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  return {
    user,
    profile,
    loading,
    initialized,
    isAuthenticated,
    role,
    init,
    login,
    logout,
    fetchProfile,
  }
})
