// Akun contoh untuk MODE MOCK (tanpa backend). Menambah akun cukup menambah satu baris di bawah.
//
// Sembilan akun pertama (satu per role) sama dengan database/seeders/UserSeeder.php di backend:
// email {role}@servolta.test, kata sandi "password". Dengan begitu perilaku FE dan BE mudah dibandingkan.
// Nama tampilan di sini nama orang contoh (di seeder backend nama = label role); email dan
// kata sandi yang sama, jadi login ke backend tetap memakai akun yang sama.
// Akun bertanda "khusus mock" hanya ada di sini, untuk menguji skenario tertentu.

import { ROLES, ROLE_LABELS, permissionsFor } from '../lib/roles.js'

const DEFAULT_PASSWORD = 'password'

const SAMPLE_NAMES = {
  superadmin: 'Rangga Pratama',
  admin: 'Dewi Lestari',
  spv: 'Bagas Saputra',
  cs: 'Citra Maharani',
  ts: 'Taufik Hidayat',
  mo: 'Maya Anggraini',
  sales: 'Salsa Wulandari',
  konten: 'Kevin Aditya',
  intern: 'Intan Permata',
}

function account({
  id,
  role,
  name = SAMPLE_NAMES[role],
  email = `${role}@servolta.test`,
  password = DEFAULT_PASSWORD,
  is_active = true,
  note = '',
}) {
  return {
    id,
    name,
    email,
    password,
    role,
    role_label: ROLE_LABELS[role],
    is_active,
    permissions: permissionsFor(role),
    note,
  }
}

export const MOCK_ACCOUNTS = [
  ...ROLES.map((role, index) => account({ id: index + 1, role })),

  // Khusus mock: untuk menguji pesan "akun dinonaktifkan" saat login.
  account({
    id: 100,
    role: 'cs',
    name: 'Akun Nonaktif',
    email: 'nonaktif@servolta.test',
    is_active: false,
    note: 'Khusus mock: login harus ditolak',
  }),
]

// Bentuk yang dikirim ke aplikasi: tanpa kata sandi dan tanpa catatan.
export function toPublicUser(acc) {
  const { password: _password, note: _note, ...user } = acc
  return user
}
