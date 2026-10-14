import * as mockApi from './mock.js'
import * as realApi from './real.js'

// Mode mock aktif kecuali VITE_USE_MOCK=false (lihat .env.development).
export const isMock = import.meta.env.VITE_USE_MOCK !== 'false'
export const api = isMock ? mockApi : realApi

export { ApiError } from './errors.js'
