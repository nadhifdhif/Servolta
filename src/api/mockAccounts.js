// Akun contoh untuk MODE MOCK (tanpa backend). Menambah akun cukup menambah satu baris di bawah.
//
// Delapan akun pertama (satu per role) sama dengan database/seeders/UserSeeder.php di backend:
// kode {ROLE}01 (mis. CS01), kata sandi "password". Dengan begitu perilaku FE dan BE mudah dibandingkan.
// Nama tampilan di sini nama orang contoh (di seeder backend nama = label role); kode dan
// kata sandi yang sama, jadi login ke backend tetap memakai akun yang sama.
// Akun bertanda "khusus mock" hanya ada di sini, untuk menguji skenario tertentu.

import { ROLES, ROLE_LABELS, permissionsFor } from '../lib/roles.js'

const DEFAULT_PASSWORD = 'password'

const SAMPLE_NAMES = {
  admin: 'Dewi Lestari',
  spv: 'Bagas Saputra',
  cs: 'Citra Maharani',
  ts: 'Taufik Hidayat',
  mo: 'Maya Anggraini',
  sales: 'Salsa Wulandari',
  konten: 'Kevin Aditya',
  intern: 'Intan Permata',
}

export function buildAccount({
  id,
  role,
  name = SAMPLE_NAMES[role],
  login_code = `${role.toUpperCase()}01`,
  employee_id = null,
  password = DEFAULT_PASSWORD,
  is_active = true,
  must_change_password = false,
  failed_logins = 0,
  locked_until = 0, // ms epoch; 0 = tidak terkunci
  note = '',
}) {
  return {
    id,
    name,
    login_code,
    employee_id,
    password,
    role,
    role_label: ROLE_LABELS[role],
    is_active,
    must_change_password,
    failed_logins,
    locked_until,
    permissions: permissionsFor(role),
    note,
  }
}

export const MOCK_ACCOUNTS = [
  // ID karyawan di bawah ini hanya contoh (angka), bukan data sungguhan.
  ...ROLES.map((role, index) => buildAccount({ id: index + 1, role, employee_id: 100200 + index })),

  // Khusus mock: untuk menguji pesan "akun dinonaktifkan" saat login.
  buildAccount({
    id: 100,
    role: 'cs',
    name: 'Akun Nonaktif',
    login_code: 'NONAKTIF',
    is_active: false,
    note: 'Khusus mock: login harus ditolak',
  }),
]

// Bentuk yang dikirim ke aplikasi: tanpa kata sandi dan tanpa catatan.
export function toPublicUser(acc) {
  const { password: _password, note: _note, failed_logins: _f, locked_until, ...user } = acc
  return { ...user, is_locked: locked_until > Date.now() }
}
