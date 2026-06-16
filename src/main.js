import './assets/index.css'
import 'sweetalert2/dist/sweetalert2.min.css'
import 'gooey-toast/styles.css'
import { mountToaster } from 'gooey-toast'

mountToaster({ position: 'top-center' })

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { MotionPlugin } from '@vueuse/motion'
import { useAuthStore } from '@/stores/auth'
import {
  vueErrorHandler,
  vueWarnHandler,
  registerGlobalErrorHandlers,
} from '@/services/errorTracker'

const app = createApp(App)
const pinia = createPinia()

// Daftarkan error handler global untuk menangkap semua error di sistem
app.config.errorHandler = vueErrorHandler
// warnHandler hanya aktif di development — Vue production build mengabaikannya secara internal
if (import.meta.env.DEV) {
  app.config.warnHandler = vueWarnHandler
}
registerGlobalErrorHandlers()

app.use(pinia)
app.use(router)
app.use(MotionPlugin)

// Restore session sebelum mount agar router guard tidak perlu init ulang
const authStore = useAuthStore()
authStore.init().then(() => {
  app.mount('#app')
})
