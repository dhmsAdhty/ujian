/**
 * errorTracker.js
 * Service untuk menangkap error dari Vue dan JavaScript global,
 * lalu menyimpannya ke tabel `system_errors` di Supabase.
 *
 * Fitur:
 * - Menangkap error Vue (errorHandler), JS global (window.onerror),
 *   dan Promise tak ter-handle (unhandledrejection)
 * - Throttle: error yang sama dalam 60 detik tidak disimpan ulang
 * - Mengambil info user dari auth store jika tersedia
 */

import { supabase } from '@/services/supabase'

// Cache untuk throttle error duplikat (key: `type|message`, value: timestamp)
const recentErrors = new Map()
const THROTTLE_MS = 60_000 // 60 detik

/**
 * Daftar pola pesan error yang merupakan "browser noise" — non-fatal dan
 * tidak perlu dicatat ke database. Tambahkan pola baru di sini jika muncul
 * error lain yang serupa.
 *
 * Contoh yang difilter:
 * - ResizeObserver loop: dipicu vue-echarts (autoresize) saat layout berubah
 * - Failed to fetch dynamically imported module: terjadi di dev saat HMR/restart
 */
const NOISE_PATTERNS = [
  /ResizeObserver loop/i,
  /ResizeObserver loop completed with undelivered notifications/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
]

/**
 * Cek apakah pesan error termasuk noise yang harus diabaikan.
 */
function isNoise(message) {
  if (!message) return false
  return NOISE_PATTERNS.some(pattern => pattern.test(message))
}

/**
 * Menghasilkan key unik untuk throttle berdasarkan tipe + pesan error.
 */
function getErrorKey(type, message) {
  return `${type}|${(message || '').slice(0, 100)}`
}

/**
 * Cek apakah error ini sudah dilaporkan baru-baru ini (throttle).
 */
function isThrottled(type, message) {
  const key = getErrorKey(type, message)
  const lastSeen = recentErrors.get(key)
  if (lastSeen && Date.now() - lastSeen < THROTTLE_MS) return true
  recentErrors.set(key, Date.now())
  // Bersihkan cache lama agar tidak memory leak
  if (recentErrors.size > 100) {
    const oldestKey = recentErrors.keys().next().value
    recentErrors.delete(oldestKey)
  }
  return false
}

/**
 * Ambil info user yang sedang login dari Supabase session.
 */
async function getCurrentUserInfo() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { userId: null, userName: 'Guest', userRole: null }

    const userId = session.user.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .maybeSingle()

    return {
      userId,
      userName: profile?.full_name || session.user.email || 'Unknown',
      userRole: profile?.role || null
    }
  } catch {
    return { userId: null, userName: 'Unknown', userRole: null }
  }
}

let sessionErrorCount = 0
const MAX_ERRORS_PER_SESSION = 10 // Maksimal error yang dikirim per sesi buka halaman

/**
 * Fungsi utama: simpan error ke Supabase.
 * @param {Object} errorInfo
 */
async function saveError({ errorType, message, stack, component, severity = 'error' }) {
  // Cegah spam ke database jika terjadi infinite loop error di frontend
  if (sessionErrorCount >= MAX_ERRORS_PER_SESSION) return
  
  // Jangan simpan error dari development internal jika tidak perlu
  if (!message) return
  // Abaikan browser noise (ResizeObserver loop, HMR chunk errors, dll)
  if (isNoise(message)) return
  if (isThrottled(errorType, message)) return

  // Jangan rekam error dari errorTracker itu sendiri
  if ((stack || '').includes('errorTracker.js')) return

  sessionErrorCount++

  try {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const { userId, userName, userRole } = await getCurrentUserInfo()

    await supabase.from('system_errors').insert({
      error_type: errorType || 'UnknownError',
      // Potong pesan dan stack lebih pendek untuk menghemat kuota DB Free Tier
      message: (message || 'No message').slice(0, 1000),
      stack: stack ? stack.slice(0, 2000) : null,
      url: url.slice(0, 500),
      component: component || null,
      severity,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
    })
  } catch (insertErr) {
    // Gagal simpan ke DB — jangan lempar error lagi (infinite loop)
    console.warn('[ErrorTracker] Gagal menyimpan error ke database:', insertErr?.message)
  }
}

/**
 * Handler untuk Vue `app.config.errorHandler`.
 * Dipanggil otomatis saat error terjadi di dalam komponen Vue.
 */
export function vueErrorHandler(err, instance, info) {
  console.error('[Vue Error]', err)
  const componentName = instance?.$options?.name
    || instance?.__vccOpts?.name
    || instance?.$options?.__name
    || null

  saveError({
    errorType: err?.name || 'VueError',
    message: err?.message || String(err),
    stack: err?.stack || null,
    component: componentName,
    severity: 'error',
  })
}

/**
 * Handler untuk Vue `app.config.warnHandler`.
 * Menangkap warning Vue yang mungkin penting.
 */
export function vueWarnHandler(msg, instance, trace) {
  const componentName = instance?.$options?.name
    || instance?.__vccOpts?.name
    || null

  saveError({
    errorType: 'VueWarning',
    message: msg,
    stack: trace || null,
    component: componentName,
    severity: 'warning',
  })
}

/**
 * Daftarkan listener untuk menangkap error JavaScript global dan
 * unhandled Promise rejection di `window`.
 * Panggil sekali saat aplikasi dimulai.
 */
export function registerGlobalErrorHandlers() {
  if (typeof window === 'undefined') return

  // Error JavaScript sinkron global
  window.addEventListener('error', (event) => {
    // Abaikan error resource (gagal load gambar, dll)
    if (event.target && event.target !== window) return

    saveError({
      errorType: event.error?.name || 'GlobalError',
      message: event.message || 'Unknown global error',
      stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      component: null,
      severity: 'error',
    })
  }, true)

  // Promise yang tidak ter-handle (async errors)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : JSON.stringify(reason)

    saveError({
      errorType: reason?.name || 'UnhandledRejection',
      message: message || 'Promise rejected without reason',
      stack: reason?.stack || null,
      component: null,
      severity: 'error',
    })
  })
}

/**
 * Fungsi manual untuk melaporkan error dari kode aplikasi.
 * Berguna untuk try-catch blok yang ingin dilaporkan ke admin.
 *
 * @param {Error|string} error
 * @param {Object} options - { component, severity }
 *
 * @example
 * try {
 *   await riskyOperation()
 * } catch (err) {
 *   reportError(err, { component: 'BankSoal', severity: 'critical' })
 * }
 */
export function reportError(error, options = {}) {
  const { component = null, severity = 'error' } = options
  const err = error instanceof Error ? error : new Error(String(error))

  saveError({
    errorType: err.name,
    message: err.message,
    stack: err.stack,
    component,
    severity,
  })
}
