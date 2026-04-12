<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { LogIn, Mail, Lock } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) return

  loading.value = true
  const { error } = await authStore.login(email.value, password.value)

  if (error) {
    Swal.fire({
      icon: 'error',
      title: 'Login gagal',
      text: error.message,
      confirmButtonColor: '#ea580c'
    })
  } else {
    Swal.fire({
      icon: 'success',
      title: 'Selamat datang',
      text: 'Anda berhasil masuk.',
      timer: 1200,
      showConfirmButton: false
    })

    const role = authStore.role
    if (role === 'admin') router.push('/admin')
    else if (role === 'guru') router.push('/guru')
    else if (role === 'siswa') router.push('/siswa')
  }
  loading.value = false
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
    <div class="w-full max-w-[400px]">
      <div class="glass-card p-8 sm:p-10">
        <div class="mb-8 text-center">
          <div
            class="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm"
          >
            <LogIn :size="22" stroke-width="2" />
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">CBT ATS</h1>
          <p class="mt-1.5 text-sm text-zinc-500">Masuk dengan akun sekolah Anda</p>
        </div>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <div class="space-y-2">
            <label class="text-sm font-medium text-zinc-700" for="login-email">Email</label>
            <div class="relative group">
              <Mail
                class="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400 group-focus-within:text-primary-600"
                stroke-width="2"
              />
              <input
                id="login-email"
                v-model="email"
                type="email"
                class="form-input pl-10"
                placeholder="nama@sekolah.sch.id"
                required
                autocomplete="email"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-zinc-700" for="login-password">Password</label>
            <div class="relative group">
              <Lock
                class="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400 group-focus-within:text-primary-600"
                stroke-width="2"
              />
              <input
                id="login-password"
                v-model="password"
                type="password"
                class="form-input pl-10"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              v-if="loading"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
            <template v-else>
              Masuk
              <LogIn :size="18" stroke-width="2" />
            </template>
          </button>
        </form>

        <p class="mt-8 text-center text-xs text-zinc-400">CBT ATS · {{ new Date().getFullYear() }}</p>
      </div>
    </div>
  </div>
</template>
