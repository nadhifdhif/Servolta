import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { loadApi } from './api'
import { setUnauthorizedHandler } from './api/unauthorized.js'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

async function start() {
  await loadApi() // pilih mock atau backend asli sebelum ada yang memakainya

  const app = createApp(App)
  app.use(createPinia())

  // Token kedaluwarsa/dicabut di server -> bersihkan sesi dan kembali ke halaman login.
  setUnauthorizedHandler(() => {
    useAuthStore().clearSession()
    router.push({ name: 'login' })
  })

  app.use(router)
  app.mount('#app')
}

start()
