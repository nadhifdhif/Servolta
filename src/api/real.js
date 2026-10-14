// Klien untuk backend Laravel. Endpoint auth (/login, /logout, /me) sudah ada.
// Endpoint produk & FAQ adalah KONTRAK RENCANA, dibuat di langkah backend berikutnya:
//   GET    /products                  -> { data: [{ id, sku, name }] }
//   GET    /products/{id}/faqs        -> { data: [{ id, product_id, category, question, answer, updated_at }] }
//   POST   /products/{id}/faqs        -> { data: faq }
//   PUT    /faqs/{id}                 -> { data: faq }
//   DELETE /faqs/{id}                 -> 204

import { ApiError } from './errors.js'
import { tokenStorage } from './token.js'
import { notifyUnauthorized } from './unauthorized.js'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')

async function request(method, path, body) {
  const headers = { Accept: 'application/json' }
  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Pastikan backend berjalan.', 0)
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && path !== '/login') notifyUnauthorized()
    throw new ApiError(data?.message ?? 'Terjadi kesalahan.', response.status, data?.errors ?? {})
  }
  return data
}

export const login = (email, password) => request('POST', '/login', { email, password })
export const logout = () => request('POST', '/logout')
export const me = async () => (await request('GET', '/me')).data
export const listProducts = async () => (await request('GET', '/products')).data
export const listFaqs = async (productId) => (await request('GET', `/products/${productId}/faqs`)).data
export const createFaq = async (productId, payload) =>
  (await request('POST', `/products/${productId}/faqs`, payload)).data
export const updateFaq = async (id, payload) => (await request('PUT', `/faqs/${id}`, payload)).data
export const deleteFaq = (id) => request('DELETE', `/faqs/${id}`)
