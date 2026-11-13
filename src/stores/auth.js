import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api'
import { tokenStorage } from '../api/token.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)

  const isLoggedIn = computed(() => user.value !== null)
  const permissions = computed(() => user.value?.permissions ?? {})
  // Akun baru atau yang sandinya direset admin: hanya boleh membuka halaman Akun saya.
  const mustChangePassword = computed(() => user.value?.must_change_password === true)

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

  async function login(code, password) {
    const result = await api.login(code, password)
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

  function setUser(next) {
    user.value = next
  }

  function clearSession() {
    tokenStorage.clear()
    user.value = null
  }

  return {
    user,
    ready,
    isLoggedIn,
    permissions,
    mustChangePassword,
    init,
    login,
    logout,
    setUser,
    clearSession,
  }
})
