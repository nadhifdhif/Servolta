import { ref } from 'vue'
import { RECENT_KEY, parseRecent, pushRecent } from '../lib/recent.js'

// Disimpan per pengguna di browser ini, supaya akun lain di komputer yang sama tidak saling melihat.
const storageKey = (userId) => `${RECENT_KEY}_${userId}`

function read(userId) {
  try {
    return parseRecent(localStorage.getItem(storageKey(userId)))
  } catch {
    return []
  }
}

function write(userId, list) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list))
  } catch {
    /* abaikan */
  }
}

export function useRecent(getUserId) {
  const recent = ref(read(getUserId()))

  function add(product) {
    const userId = getUserId()
    recent.value = pushRecent(read(userId), product)
    write(userId, recent.value)
  }

  return { recent, add }
}
