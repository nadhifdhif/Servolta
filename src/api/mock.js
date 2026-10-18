import { ApiError } from './errors.js'
import { MOCK_ACCOUNTS, toPublicUser } from './mockAccounts.js'
import { MOCK_FAQS, MOCK_PRODUCTS } from './mockData.js'
import { MOCK_DOCUMENTS, MOCK_SPECS, MOCK_WIRING } from './mockFiles.js'
import { extOf, todayIso, validateUpload } from '../lib/files.js'
import { makeSimplePdf } from '../lib/pdf.js'
import { specsToText } from '../lib/specs.js'
import { tokenStorage } from './token.js'

const FAQ_KEY = 'servolta_mock_faqs'
let DELAY_MS = 250
const delay = (factor = 1) => new Promise((resolve) => setTimeout(resolve, DELAY_MS * factor))

// Dipakai tes agar tidak menunggu; di aplikasi nilai bawaan (250 ms) meniru jaringan.
export function setMockDelay(ms) {
  DELAY_MS = ms
}

function loadFaqs() {
  try {
    const raw = localStorage.getItem(FAQ_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* abaikan */
  }
  return structuredClone(MOCK_FAQS)
}

function saveFaqs(list) {
  try {
    localStorage.setItem(FAQ_KEY, JSON.stringify(list))
  } catch {
    /* abaikan */
  }
}

let faqs = loadFaqs()

// Wiring & datasheet hanya disimpan di memori (hilang saat halaman dimuat ulang):
// file unggahan tidak bisa disimpan di localStorage. Backend asli menyimpannya di storage privat.
let wiring = structuredClone(MOCK_WIRING)
let documents = structuredClone(MOCK_DOCUMENTS)
const uploads = new Map() // 'w1' / 'd1' -> File
let nextFileId = 1000

function currentUser() {
  const token = tokenStorage.get() ?? ''
  const found = token.startsWith('mock.')
    ? MOCK_ACCOUNTS.find((a) => String(a.id) === token.slice(5))
    : null
  if (!found || !found.is_active) throw new ApiError('Unauthenticated.', 401)
  return toPublicUser(found)
}

function requireFaqWrite() {
  if (!currentUser().permissions.write_faq) {
    throw new ApiError('Role Anda tidak boleh mengubah FAQ.', 403)
  }
}

function validateFaq(payload) {
  const errors = {}
  if (!['cs', 'ts'].includes(payload.category)) errors.category = ['Kategori tidak valid.']
  if (!payload.question?.trim()) errors.question = ['Pertanyaan wajib diisi.']
  if (!payload.answer?.trim()) errors.answer = ['Jawaban wajib diisi.']
  if (Object.keys(errors).length) throw new ApiError('Data tidak valid.', 422, errors)
}

export async function login(email, password) {
  await delay()
  const found = MOCK_ACCOUNTS.find((a) => a.email === String(email).trim().toLowerCase())
  if (!found || found.password !== password) {
    throw new ApiError('Email atau kata sandi salah.', 422, {
      email: ['Email atau kata sandi salah.'],
    })
  }
  if (!found.is_active) {
    throw new ApiError('Akun ini dinonaktifkan. Hubungi admin.', 422, {
      email: ['Akun ini dinonaktifkan. Hubungi admin.'],
    })
  }
  return { token: `mock.${found.id}`, token_type: 'Bearer', user: toPublicUser(found) }
}

export async function logout() {
  await delay(0.4)
}

export async function me() {
  await delay(0.4)
  return currentUser()
}

export async function listProducts() {
  await delay()
  currentUser()
  return structuredClone(MOCK_PRODUCTS)
}

export async function getOverview() {
  await delay(0.4)
  currentUser()
  return {
    faq: faqs.length,
    products: MOCK_PRODUCTS.length,
    wiring: wiring.length,
    datasheet: documents.length,
  }
}

function requireProductsWrite() {
  if (!currentUser().permissions.write_products) {
    throw new ApiError('Role Anda tidak boleh mengunggah atau menghapus dokumen.', 403)
  }
}

function validateUploadPayload(kind, payload) {
  const errors = {}
  if (!payload.title?.trim()) errors.title = ['Judul wajib diisi.']
  const fileError = validateUpload(kind, payload.file)
  if (fileError) errors.file = [fileError]
  if (Object.keys(errors).length) throw new ApiError('Data tidak valid.', 422, errors)
}

export async function listWiring(productId) {
  await delay()
  currentUser()
  return structuredClone(wiring.filter((w) => w.product_id === productId))
}

// Mengembalikan Blob gambar. Di backend asli: GET dengan token, lalu dibuat blob URL.
export async function getWiringImage(id) {
  await delay(0.5)
  currentUser()
  const file = uploads.get(`w${id}`)
  if (!file) throw new ApiError('Gambar tidak ditemukan.', 404)
  return file
}

export async function createWiring(productId, payload) {
  await delay()
  requireProductsWrite()
  validateUploadPayload('wiring', payload)
  const ext = extOf(payload.file.name)
  const doc = {
    id: nextFileId++,
    product_id: productId,
    kind: 'image',
    title: payload.title.trim(),
    tag: 'Instalasi',
    rev: payload.rev?.trim() || '1',
    date: todayIso(),
    format: ['jpg', 'jpeg'].includes(ext)
      ? 'JPG'
      : ['heic', 'heif'].includes(ext)
        ? 'JPG'
        : ext.toUpperCase(),
    dimensions: '',
    size: payload.file.size,
    note: ['heic', 'heif'].includes(ext)
      ? 'Diunggah sebagai HEIC, diubah otomatis ke JPG oleh server'
      : '',
    previewable: !['heic', 'heif', 'tif', 'tiff'].includes(ext),
  }
  uploads.set(`w${doc.id}`, payload.file)
  wiring = [...wiring, doc]
  return structuredClone(doc)
}

export async function deleteWiring(id) {
  await delay()
  requireProductsWrite()
  wiring = wiring.filter((w) => w.id !== id)
  uploads.delete(`w${id}`)
}

export async function getDatasheet(productId) {
  await delay()
  currentUser()
  return {
    specs: structuredClone(MOCK_SPECS[productId] ?? []),
    documents: structuredClone(documents.filter((d) => d.product_id === productId)),
  }
}

export async function downloadDatasheet(id) {
  await delay(0.5)
  currentUser()
  const stored = uploads.get(`d${id}`)
  if (stored) return stored
  const doc = documents.find((d) => d.id === id)
  const product = MOCK_PRODUCTS.find((p) => p.id === doc?.product_id)
  if (!doc || !product) throw new ApiError('Dokumen tidak ditemukan.', 404)
  const lines = [
    `Rev. ${doc.rev} - ${doc.lang}`,
    '',
    ...specsToText(product, MOCK_SPECS[product.id] ?? []).split('\n'),
    '',
    '(Dokumen contoh untuk mode mock, bukan datasheet resmi.)',
  ]
  return new Blob([makeSimplePdf(`${doc.title} ${product.sku}`, lines)], {
    type: 'application/pdf',
  })
}

export async function createDatasheetDoc(productId, payload) {
  await delay()
  requireProductsWrite()
  validateUploadPayload('datasheet', payload)
  const doc = {
    id: nextFileId++,
    product_id: productId,
    kind: 'datasheet',
    title: payload.title.trim(),
    pages: null,
    size: payload.file.size,
    rev: payload.rev?.trim() || '1',
    date: todayIso(),
    lang: 'Indonesia',
  }
  uploads.set(`d${doc.id}`, payload.file)
  documents = [...documents, doc]
  return structuredClone(doc)
}

export async function deleteDatasheetDoc(id) {
  await delay()
  requireProductsWrite()
  documents = documents.filter((d) => d.id !== id)
  uploads.delete(`d${id}`)
}

export async function listFaqs(productId) {
  await delay()
  currentUser()
  return faqs.filter((f) => f.product_id === productId).map((f) => ({ ...f }))
}

export async function createFaq(productId, payload) {
  await delay()
  requireFaqWrite()
  validateFaq(payload)
  const created = {
    id: Math.max(0, ...faqs.map((f) => f.id)) + 1,
    product_id: productId,
    category: payload.category,
    question: payload.question.trim(),
    answer: payload.answer.trim(),
    updated_at: new Date().toISOString(),
  }
  faqs = [...faqs, created]
  saveFaqs(faqs)
  return { ...created }
}

export async function updateFaq(id, payload) {
  await delay()
  requireFaqWrite()
  validateFaq(payload)
  const index = faqs.findIndex((f) => f.id === id)
  if (index === -1) throw new ApiError('FAQ tidak ditemukan.', 404)
  const updated = {
    ...faqs[index],
    category: payload.category,
    question: payload.question.trim(),
    answer: payload.answer.trim(),
    updated_at: new Date().toISOString(),
  }
  faqs = faqs.map((f) => (f.id === id ? updated : f))
  saveFaqs(faqs)
  return { ...updated }
}

export async function deleteFaq(id) {
  await delay()
  requireFaqWrite()
  faqs = faqs.filter((f) => f.id !== id)
  saveFaqs(faqs)
}

export function resetMock() {
  try {
    localStorage.removeItem(FAQ_KEY)
  } catch {
    /* abaikan */
  }
  faqs = structuredClone(MOCK_FAQS)
  wiring = structuredClone(MOCK_WIRING)
  documents = structuredClone(MOCK_DOCUMENTS)
  uploads.clear()
}
