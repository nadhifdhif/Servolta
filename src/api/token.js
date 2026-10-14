const KEY = 'servolta_token'

// localStorage bisa dilarang (mode privat, dsb.), jadi semua akses dibungkus try/catch.
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(value) {
    try {
      localStorage.setItem(KEY, value)
    } catch {
      /* abaikan */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* abaikan */
    }
  },
}
