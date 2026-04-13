<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const router = useRouter()
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const sessionReady = ref(false)
const errors = ref({})

// Supabase mengirim token via URL hash — perlu tunggu session terset
onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  sessionReady.value = !!data.session
  if (!data.session) {
    // Coba parse hash dari URL (untuk flow email link)
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
        sessionReady.value = true
      }
    }
  }
})

const validate = () => {
  const e = {}
  if (!password.value) e.password = 'Password wajib diisi'
  else if (password.value.length < 6) e.password = 'Minimal 6 karakter'
  if (password.value !== confirmPassword.value) e.confirm = 'Password tidak cocok'
  errors.value = e
  return Object.keys(e).length === 0
}

const handleReset = async () => {
  if (!validate()) return
  loading.value = true

  const { error } = await supabase.auth.updateUser({ password: password.value })
  loading.value = false

  if (error) {
    Swal.fire('Gagal', error.message, 'error')
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'Password Berhasil Diubah',
      text: 'Silakan login dengan password baru Anda.',
      confirmButtonColor: '#4318ff',
      timer: 2000,
      showConfirmButton: false,
    })
    await supabase.auth.signOut()
    router.push('/login')
  }
}
</script>

<template>
  <div class="flex min-h-screen w-full items-center justify-center bg-venus-50 px-4 py-12">
    <!-- Brand -->
    <div class="absolute left-6 top-6 flex items-center gap-2">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-ios-sm">
        <KeyRound :size="18" stroke-width="2" />
      </div>
      <span class="text-base font-black uppercase tracking-widest text-primary-600">CBT ATS</span>
    </div>

    <div class="w-full max-w-[460px] rounded-3xl border border-venus-100 bg-white px-8 py-10 sm:px-10">
      <!-- Session not ready -->
      <div v-if="!sessionReady" class="text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <KeyRound :size="26" stroke-width="2" />
        </div>
        <h1 class="text-xl font-black text-venus-900">Link Tidak Valid</h1>
        <p class="mt-2 text-sm text-venus-400">
          Link reset password sudah kadaluarsa atau tidak valid. Minta link baru dari administrator.
        </p>
        <button
          type="button"
          class="mt-6 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          @click="router.push('/login')"
        >
          Kembali ke Login
        </button>
      </div>

      <!-- Form reset -->
      <div v-else>
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <KeyRound :size="22" stroke-width="2" />
          </div>
          <h1 class="text-2xl font-black tracking-tight text-venus-900">Buat Password Baru</h1>
          <p class="mt-1.5 text-sm text-venus-400">Masukkan password baru untuk akun Anda</p>
        </div>

        <form class="space-y-5" @submit.prevent="handleReset">
          <!-- Password baru -->
          <div class="space-y-1.5">
            <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400">
              Password Baru
            </label>
            <div class="relative group">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input pr-11"
                :class="errors.password ? 'border-red-300' : ''"
                placeholder="Minimal 6 karakter"
                autocomplete="new-password"
              />
              <button
                v-if="password"
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-venus-400 hover:text-venus-600"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="!showPassword" :size="17" />
                <EyeOff v-else :size="17" />
              </button>
            </div>
            <p v-if="errors.password" class="ml-0.5 text-xs text-red-600">{{ errors.password }}</p>
          </div>

          <!-- Konfirmasi password -->
          <div class="space-y-1.5">
            <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400">
              Konfirmasi Password
            </label>
            <div class="relative group">
              <input
                v-model="confirmPassword"
                :type="showConfirm ? 'text' : 'password'"
                class="form-input pr-11"
                :class="errors.confirm ? 'border-red-300' : ''"
                placeholder="Ulangi password baru"
                autocomplete="new-password"
              />
              <button
                v-if="confirmPassword"
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-venus-400 hover:text-venus-600"
                @click="showConfirm = !showConfirm"
              >
                <Eye v-if="!showConfirm" :size="17" />
                <EyeOff v-else :size="17" />
              </button>
              <!-- Match indicator -->
              <CheckCircle2
                v-if="confirmPassword && password === confirmPassword"
                :size="17"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"
              />
            </div>
            <p v-if="errors.confirm" class="ml-0.5 text-xs text-red-600">{{ errors.confirm }}</p>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-ios-md transition-[transform,background-color,opacity] duration-200 ease-ios active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <template v-else>
              <KeyRound :size="17" />
              Simpan Password Baru
            </template>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
