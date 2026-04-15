import './assets/index.css'
import 'sweetalert2/dist/sweetalert2.min.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { MotionPlugin } from '@vueuse/motion'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(MotionPlugin)

// Restore session sebelum mount agar router guard tidak perlu init ulang
const authStore = useAuthStore()
authStore.init().then(() => {
  app.mount('#app')
})
