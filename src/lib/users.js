import { CODE_PATTERN, normalizeCode } from './loginCode.js'
import { manageableRoles } from './roles.js'

export const PASSWORD_MIN = 10
export const EMPLOYEE_ID_MAX = 2147483647

// Mengembalikan { kolom: [pesan] }; objek kosong berarti sah.
// `otherCodes` dan `otherEmployeeIds` = milik semua akun lain (tanpa akun yang sedang diubah).
// Saat mengubah, kata sandi boleh kosong (artinya tidak diganti).
export function validateUser(
  payload,
  { actorRole, otherCodes = [], otherEmployeeIds = [], isEdit = false },
) {
  const errors = {}

  const name = String(payload.name ?? '').trim()
  if (!name) errors.name = ['Nama wajib diisi.']
  else if (name.length > 100) errors.name = ['Nama maksimal 100 karakter.']

  const code = normalizeCode(payload.login_code)
  if (!code) errors.login_code = ['Kode login wajib diisi.']
  else if (!CODE_PATTERN.test(code)) {
    errors.login_code = ['Kode hanya boleh huruf besar dan angka, 4 sampai 20 karakter.']
  } else if (otherCodes.map(normalizeCode).includes(code)) {
    errors.login_code = ['Kode ini sudah dipakai akun lain.']
  }

  const rawId = String(payload.employee_id ?? '').trim()
  if (rawId) {
    const id = Number(rawId)
    if (!/^\d+$/.test(rawId) || id < 1 || id > EMPLOYEE_ID_MAX) {
      errors.employee_id = ['ID karyawan harus berupa angka.']
    } else if (otherEmployeeIds.map(Number).includes(id)) {
      errors.employee_id = ['ID karyawan ini sudah terdaftar pada akun lain.']
    }
  }

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

// Aturan ganti sandi sendiri (dipakai halaman Akun saya dan mock).
export function validatePasswordChange({ current_password, password, password_confirmation }) {
  const errors = {}
  if (!current_password) errors.current_password = ['Kata sandi saat ini wajib diisi.']
  if (!password) errors.password = ['Kata sandi baru wajib diisi.']
  else if (password.length < PASSWORD_MIN) {
    errors.password = [`Kata sandi minimal ${PASSWORD_MIN} karakter.`]
  } else if (password === current_password) {
    errors.password = ['Kata sandi baru harus berbeda dari yang lama.']
  } else if (password !== password_confirmation) {
    errors.password_confirmation = ['Konfirmasi kata sandi tidak sama.']
  }
  return errors
}
