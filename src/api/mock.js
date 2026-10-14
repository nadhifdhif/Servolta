import { ApiError } from './errors.js'
import { MOCK_FAQS, MOCK_PRODUCTS, MOCK_USERS } from './mockData.js'
import { tokenStorage } from './token.js'

const FAQ_KEY = 'servolta_mock_faqs'
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

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

function currentUser() {
  const token = tokenStorage.get() ?? ''
  const user = token.startsWith('mock.') ? MOCK_USERS.find((u) => u.role === token.slice(5)) : null
  if (!user) throw new ApiError('Unauthenticated.', 401)
  return user
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
  const user = MOCK_USERS.find((u) => u.email === String(email).trim().toLowerCase())
  if (!user || password !== 'password') {
    throw new ApiError('Email atau kata sandi salah.', 422, { email: ['Email atau kata sandi salah.'] })
  }
  return { token: `mock.${user.role}`, token_type: 'Bearer', user }
}

export async function logout() {
  await delay(100)
}

export async function me() {
  await delay(100)
  return currentUser()
}

export async function listProducts() {
  await delay()
  currentUser()
  return structuredClone(MOCK_PRODUCTS)
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
}
