import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api'
import { tokenStorage } from '../api/token.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)

  const isLoggedIn = computed(() => user.value !== null)
  const permissions = computed(() => user.value?.permissions ?? {})

  // Dipanggil sekali oleh router guard: pulihkan sesi dari token yang tersimpan.
  async function init() {
    if (ready.value) return
    if (tokenStorage.get()) {
      try {
        user.value = await api.me()
      } catch {
        tokenStorage.clear()
        user.value = null
      }
    }
    ready.value = true
  }

  async function login(email, password) {
    const result = await api.login(email, password)
    tokenStorage.set(result.token)
    user.value = result.user
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      /* token mungkin sudah tidak berlaku; tetap bersihkan sesi lokal */
    }
    clearSession()
  }

  function clearSession() {
    tokenStorage.clear()
    user.value = null
  }

  return { user, ready, isLoggedIn, permissions, init, login, logout, clearSession }
})
