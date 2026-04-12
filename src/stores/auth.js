import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => profile.value?.role || null)

  async function fetchProfile() {
    if (!user.value) return
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (!error) {
      profile.value = data
      // Update last_login
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.value.id)
    }
  }

  async function login(email, password) {
    loading.value = true
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (!error) {
      user.value = data.user
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
    isAuthenticated,
    role,
    login,
    logout,
    fetchProfile
  }
})
