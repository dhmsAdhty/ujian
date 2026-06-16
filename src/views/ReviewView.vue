<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { supabase } from '@/services/supabase'
import { MessageSquarePlus, User, Send, CheckCircle2, LogIn, ShieldCheck } from 'lucide-vue-next'
import { AppSelect } from '@/components/ui'
import Swal from 'sweetalert2'
import { toast } from 'gooey-toast'

const nama     = ref('')
const kategori = ref('')
const pesan    = ref('')
const loading  = ref(false)
const submitted = ref(false)

const kategoriOptions = [
  { value: 'saran',   label: 'Saran' },
  { value: 'kritik',  label: 'Kritik' },
  { value: 'bug',     label: 'Laporan Bug' },
  { value: 'lainnya', label: 'Lainnya' },
]

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

const handleSubmit = async () => {
  if (!nama.value.trim() || !kategori.value || !pesan.value.trim()) return

  if (!turnstileToken.value) {
    toast.warning({ title: 'Verifikasi diperlukan', description: 'Selesaikan tantangan keamanan Cloudflare terlebih dahulu.' })
    return
  }

  loading.value = true

  const { error } = await supabase.from('feedback').insert([{
    nama:     nama.value.trim(),
    kategori: kategori.value,
    pesan:    pesan.value.trim(),
  }])

  loading.value = false

  if (error) {
    if (window.turnstile && turnstileWidgetId.value !== null) {
      window.turnstile.reset(turnstileWidgetId.value)
    }
    turnstileToken.value = ''

    toast.error({ title: 'Gagal mengirim', description: error.message })
  } else {
    submitted.value = true
  }
}

const resetForm = () => {
  nama.value     = ''
  kategori.value = ''
  pesan.value    = ''
  submitted.value = false
}
</script>

<template>
  <div class="flex min-h-[100dvh] w-full items-center justify-center bg-venus-50 p-4 sm:p-8 relative">

    <!-- Brand mark -->
    <div class="hidden sm:flex absolute left-6 top-6 items-center gap-2">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-ios-sm">
        <MessageSquarePlus :size="18" stroke-width="2" />
      </div>
      <span class="text-base font-black uppercase tracking-widest text-primary-600">CBT ATS</span>
    </div>

    <!-- Card -->
    <div
      v-motion
      :initial="{ opacity: 0, y: 16 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 420 } }"
      class="w-full max-w-[480px] rounded-2xl sm:rounded-3xl border border-venus-100 bg-white px-5 py-8 sm:px-10 sm:py-10 shadow-sm sm:shadow-none"
    >

      <!-- Success State -->
      <div v-if="submitted" class="flex flex-col items-center text-center py-6 space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 class="text-emerald-500" :size="36" />
        </div>
        <h2 class="text-xl font-black text-venus-900">Terima Kasih!</h2>
        <p class="text-sm text-venus-400 leading-relaxed">
          Masukan Anda telah berhasil dikirim.<br>Kami akan mempertimbangkan setiap saran dan kritik dengan serius.
        </p>
        <button
          @click="resetForm"
          class="mt-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          Kirim Lagi
        </button>
      </div>

      <!-- Form State -->
      <template v-else>
        <!-- Header -->
        <div class="mb-8 flex flex-col items-center text-center">
          <div class="mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[20px] bg-white p-2 shadow-ios-md">
            <img src="/ATSLogo -trans.png" alt="Logo ATS" class="h-full w-full object-contain" />
          </div>
          <h1 class="text-xl font-black tracking-tight text-venus-900">Saran & Kritik</h1>
          <p class="mt-1.5 text-sm text-venus-400">Bantu kami menjadi lebih baik</p>
        </div>

        <form class="space-y-5" @submit.prevent="handleSubmit">

          <!-- Nama -->
          <div class="space-y-1.5">
            <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400" for="review-nama">
              Nama
            </label>
            <div class="relative group">
              <User
                class="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-venus-400 transition-colors group-focus-within:text-primary-600"
                stroke-width="2"
              />
              <input
                id="review-nama"
                v-model="nama"
                type="text"
                class="form-input pl-10"
                placeholder="Nama kamu"
                required
                maxlength="100"
              />
            </div>
          </div>

          <!-- Kategori -->
          <div class="space-y-1.5">
            <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400">
              Kategori
            </label>
            <AppSelect
              v-model="kategori"
              placeholder="Pilih kategori..."
              :options="kategoriOptions"
            />
          </div>

          <!-- Pesan -->
          <div class="space-y-1.5">
            <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400" for="review-pesan">
              Pesan
            </label>
            <textarea
              id="review-pesan"
              v-model="pesan"
              rows="4"
              class="form-input resize-none leading-relaxed"
              placeholder="Tuliskan saran atau kritik kamu di sini..."
              required
              maxlength="1000"
            />
            <p class="text-right text-[10px] text-venus-300">{{ pesan.length }}/1000</p>
          </div>

          <!-- Cloudflare Turnstile CAPTCHA -->
          <div class="space-y-1.5">
            <label class="ml-0.5 block text-[11px] font-black uppercase tracking-widest text-venus-400">
              Verifikasi Keamanan
            </label>
            <div class="overflow-hidden rounded-xl border border-venus-100 bg-venus-50">
              <div id="turnstile-container" class="flex min-h-[65px] items-center justify-center" />
            </div>
            <p v-if="turnstileToken" class="ml-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <ShieldCheck :size="12" /> Verifikasi berhasil
            </p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading || !nama || !kategori || !pesan || !turnstileToken"
            class="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-ios-md transition-[transform,background-color,opacity] duration-200 ease-ios active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <template v-else>
              Kirim Masukan
              <Send :size="16" stroke-width="2" />
            </template>
          </button>
        </form>

        <!-- Login hint -->
        <p class="mt-8 text-center text-xs text-venus-400">
          Punya akun?
          <router-link to="/login" class="font-semibold text-primary-600 hover:underline inline-flex items-center gap-1">
            <LogIn :size="11" /> Masuk
          </router-link>
        </p>
      </template>

    </div>
  </div>
</template>
