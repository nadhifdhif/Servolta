// Klien untuk backend Laravel. Endpoint auth (/login, /logout, /me) sudah ada.
// Endpoint produk & FAQ adalah KONTRAK RENCANA, dibuat di langkah backend berikutnya:
//   GET    /products                  -> { data: [{ id, sku, name }] }
//   GET    /products/{id}/faqs        -> { data: [{ id, product_id, category, question, answer, updated_at }] }
//   POST   /products/{id}/faqs        -> { data: faq }
//   PUT    /faqs/{id}                 -> { data: faq }
//   DELETE /faqs/{id}                 -> 204
//   GET    /products/{id}/wiring      -> { data: [{ id, product_id, kind: 'image', title, tag, rev, date, format, dimensions, size, note }] }
//   GET    /wiring/{id}/file          -> biner gambar (butuh token, jadi diambil dengan fetch lalu dibuat blob URL)
//   POST   /products/{id}/wiring      -> multipart: title, rev, file (JPG/PNG/WebP/GIF/SVG/HEIC, maks. 15 MB)
//   DELETE /wiring/{id}               -> 204
//   GET    /products/{id}/datasheet   -> { data: { specs: [[label, nilai]], documents: [{ id, kind, title, pages, size, rev, date, lang }] } }
//   GET    /datasheet-documents/{id}/file -> biner PDF
//   POST   /products/{id}/datasheet-documents -> multipart: title, rev, file (PDF, maks. 20 MB)
//   DELETE /datasheet-documents/{id}  -> 204

import { ApiError } from './errors.js'
import { tokenStorage } from './token.js'
import { notifyUnauthorized } from './unauthorized.js'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')

async function request(method, path, body) {
  const headers = { Accept: 'application/json' }
  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  // Untuk FormData, browser mengatur Content-Type (beserta boundary) sendiri.
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
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

async function requestBlob(path) {
  const headers = {}
  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`
  let response
  try {
    response = await fetch(BASE + path, { headers })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Pastikan backend berjalan.', 0)
  }
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized()
    throw new ApiError('File tidak dapat dimuat.', response.status)
  }
  return response.blob()
}

function uploadForm({ title, rev, file }) {
  const form = new FormData()
  form.append('title', title)
  if (rev) form.append('rev', rev)
  form.append('file', file)
  return form
}

export const login = (email, password) => request('POST', '/login', { email, password })
export const logout = () => request('POST', '/logout')
export const me = async () => (await request('GET', '/me')).data
// Belum ada endpoint ringkasan di backend: beranda menyembunyikan angkanya bila null.
export const getOverview = async () => null
export const listProducts = async () => (await request('GET', '/products')).data
export const listFaqs = async (productId) =>
  (await request('GET', `/products/${productId}/faqs`)).data
export const createFaq = async (productId, payload) =>
  (await request('POST', `/products/${productId}/faqs`, payload)).data
export const updateFaq = async (id, payload) => (await request('PUT', `/faqs/${id}`, payload)).data
export const deleteFaq = (id) => request('DELETE', `/faqs/${id}`)
export const listWiring = async (productId) =>
  (await request('GET', `/products/${productId}/wiring`)).data
export const getWiringImage = (id) => requestBlob(`/wiring/${id}/file`)
export const createWiring = async (productId, payload) =>
  (await request('POST', `/products/${productId}/wiring`, uploadForm(payload))).data
export const deleteWiring = (id) => request('DELETE', `/wiring/${id}`)
export const getDatasheet = async (productId) =>
  (await request('GET', `/products/${productId}/datasheet`)).data
export const downloadDatasheet = (id) => requestBlob(`/datasheet-documents/${id}/file`)
export const createDatasheetDoc = async (productId, payload) =>
  (await request('POST', `/products/${productId}/datasheet-documents`, uploadForm(payload))).data
export const deleteDatasheetDoc = (id) => request('DELETE', `/datasheet-documents/${id}`)
