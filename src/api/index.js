import { isMock } from '../config.js'

export { isMock }
export { ApiError } from './errors.js'

// `api` diisi oleh loadApi() sebelum aplikasi dipasang (lihat main.js). Modul mock diimpor secara
// dinamis di cabang yang hanya hidup saat pengembangan, jadi tidak ikut ke hasil `npm run build`.
export let api = null

export async function loadApi() {
  if (api) return api
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false') {
    api = await import('./mock.js')
  } else {
    api = await import('./real.js')
  }
  return api
}
