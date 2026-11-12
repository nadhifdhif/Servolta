import { manageableRoles } from './roles.js'

export const PASSWORD_MIN = 8

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const normalizeEmail = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

// Mengembalikan { kolom: [pesan] }; objek kosong berarti sah.
// `otherEmails` = email semua akun lain (tanpa akun yang sedang diubah).
// Saat mengubah, kata sandi boleh kosong (artinya tidak diganti).
export function validateUser(payload, { actorRole, otherEmails = [], isEdit = false }) {
  const errors = {}

  const name = String(payload.name ?? '').trim()
  if (!name) errors.name = ['Nama wajib diisi.']
  else if (name.length > 100) errors.name = ['Nama maksimal 100 karakter.']

  const email = normalizeEmail(payload.email)
  if (!email) errors.email = ['Email wajib diisi.']
  else if (email.length > 255 || !EMAIL_PATTERN.test(email))
    errors.email = ['Format email tidak valid.']
  else if (otherEmails.map(normalizeEmail).includes(email))
    errors.email = ['Email ini sudah dipakai akun lain.']

  if (!payload.role) errors.role = ['Role wajib dipilih.']
  else if (!manageableRoles(actorRole).includes(payload.role)) {
    errors.role = ['Anda tidak boleh memberikan role ini.']
  }

  const password = String(payload.password ?? '')
  if (!password) {
    if (!isEdit) errors.password = ['Kata sandi wajib diisi.']
  } else if (password.length < PASSWORD_MIN) {
    errors.password = [`Kata sandi minimal ${PASSWORD_MIN} karakter.`]
  }

  return errors
}
