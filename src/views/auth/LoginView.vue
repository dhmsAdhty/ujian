<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { LogIn, Mail, Lock, ShieldCheck } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

// ─── Turnstile ────────────────────────────────────────────
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const turnstileToken = ref('')
const turnstileWidgetId = ref(null)
const turnstileReady = ref(false)

const loadTurnstileScript = () => {
  return new Promise((resolve) => {
    if (window.turnstile) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = resolve
    document.head.appendChild(script)
  })
}

const renderTurnstile = () => {
  if (!window.turnstile || !SITE_KEY) return
  turnstileWidgetId.value = window.turnstile.render('#turnstile-container', {
    sitekey: SITE_KEY,
    theme: 'light',
    size: 'normal',
    callback: (token) => {
      turnstileToken.value = token
    },
    'expired-callback': () => {
      turnstileToken.value = ''
    },
    'error-callback': () => {
      turnstileToken.value = ''
    },
  })
  turnstileReady.value = true
}

onMounted(async () => {
  await loadTurnstileScript()
  // Tunggu sampai turnstile global tersedia
  const wait = setInterval(() => {
    if (window.turnstile) {
      clearInterval(wait)
      renderTurnstile()
    }
  }, 100)
})

onBeforeUnmount(() => {
  if (turnstileWidgetId.value !== null && window.turnstile) {
    window.turnstile.remove(turnstileWidgetId.value)
  }
})
// ─────────────────────────────────────────────────────────

const handleLogin = async () => {
  if (!email.value || !password.value) return

  // Blokir submit jika CAPTCHA belum selesai
  if (!turnstileToken.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Verifikasi diperlukan',
      text: 'Selesaikan tantangan keamanan Cloudflare terlebih dahulu.',
      confirmButtonColor: '#4318ff',
    })
    return
  }

  loading.value = true
  const { error } = await authStore.login(email.value, password.value)

  if (error) {
    // Reset turnstile agar tidak bisa reuse token lama
    if (window.turnstile && turnstileWidgetId.value !== null) {
      window.turnstile.reset(turnstileWidgetId.value)
    }
    turnstileToken.value = ''

    Swal.fire({
      icon: 'error',
      title: 'Login gagal',
      text: error.message,
      confirmButtonColor: '#4318ff'
    })
  } else {
    await Swal.fire({
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
    else router.push('/')
  }
  loading.value = false
}
</script>

<template>
  <!-- Auth layout — mirrors Venus AuthLayout: centered, white Paper card -->
  <div class="flex min-h-screen w-full items-center justify-center bg-venus-50 px-4 py-12">
    <!-- Brand mark top-left (mirrors Venus AuthLayout logo) -->
    <div class="absolute left-6 top-6 flex items-center gap-2">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-ios-sm">
        <LogIn :size="18" stroke-width="2" />
      </div>
      <span class="text-base font-black uppercase tracking-widest text-primary-600">CBT ATS</span>
    </div>

    <!-- Card — mirrors Venus Paper: white, rounded-3xl, no shadow, max-w-460 -->
    <div
      v-motion
      :initial="{ opacity: 0, y: 16 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 420 } }"
      class="w-full max-w-[460px] rounded-3xl border border-venus-100 bg-white px-8 py-10 sm:px-10"
    >
      <div class="mb-8 flex flex-col items-center text-center">
        <div class="mb-5 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] bg-white p-3 shadow-ios-md">
          <img src="/ATSLogo -trans.png" alt="Logo ATS" class="h-full w-full object-contain" />
        </div>
        <h1 class="text-2xl font-black tracking-tight text-venus-900">COMPUTER BASED TEST</h1>
        <p class="mt-1.5 text-sm text-venus-400">Sekolah Tahfidz Al Hikmah</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleLogin">
        <!-- Email -->
        <div class="space-y-1.5">
          <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400" for="login-email">
            Email
          </label>
          <div class="relative group">
            <Mail
              class="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-venus-400 transition-colors group-focus-within:text-primary-600"
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

        <!-- Password -->
        <div class="space-y-1.5">
          <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400" for="login-password">
            Password
          </label>
          <div class="relative group">
            <Lock
              class="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-venus-400 transition-colors group-focus-within:text-primary-600"
              stroke-width="2"
            />
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input pl-10 pr-11"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
            <button
              v-if="password"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-venus-400 transition-colors hover:text-venus-600 focus-visible:outline-none"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showPassword = !showPassword"
            >
              <!-- eye / eye-off icon -->
              <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Cloudflare Turnstile CAPTCHA -->
        <div class="space-y-1.5">
          <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400">
            Verifikasi Keamanan
          </label>
          <div class="overflow-hidden rounded-xl border border-venus-100 bg-venus-50">
            <!-- Widget dirender di sini oleh Turnstile -->
            <div id="turnstile-container" class="flex min-h-[65px] items-center justify-center" />
          </div>
          <!-- Status verifikasi -->
          <p v-if="turnstileToken" class="ml-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <ShieldCheck :size="12" /> Verifikasi berhasil
          </p>
        </div>


        <button
          type="submit"
          :disabled="loading || !turnstileToken"
          class="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-ios-md transition-[transform,background-color,opacity] duration-200 ease-ios active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
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

      <p class="mt-8 text-center text-xs text-venus-400">CBT ATS · {{ new Date().getFullYear() }}</p>
    </div>
  </div>
</template>
