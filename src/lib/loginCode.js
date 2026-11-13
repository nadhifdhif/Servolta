// Kode login pengganti email. Aturannya sama dengan backend (app/Support/LoginCode.php).
// Kode bukan rahasia: keamanan akun datang dari kata sandi, pembatas percobaan, dan penguncian.

// Tanpa huruf/angka yang mudah tertukar (I, L, O, 0, 1).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_PATTERN = /^[A-Z0-9]{4,20}$/

const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export const normalizeCode = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

const defaultRng = (array) => globalThis.crypto.getRandomValues(array)

// Indeks acak seragam di [0, n): nilai yang jatuh di "sisa" pembagian dibuang agar tidak condong.
function randomIndex(n, rng) {
  const limit = Math.floor(0x100000000 / n) * n
  for (;;) {
    const [value] = rng(new Uint32Array(1))
    if (value < limit) return value % n
  }
}

function pick(alphabet, length, rng) {
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[randomIndex(alphabet.length, rng)]
  return out
}

export function generateCode(length = 8, rng = defaultRng) {
  return pick(CODE_ALPHABET, length, rng)
}

// Sandi sementara: campuran huruf besar, kecil, dan angka (tanpa karakter yang mudah tertukar).
export function generatePassword(length = 14, rng = defaultRng) {
  for (;;) {
    const candidate = pick(PASSWORD_ALPHABET, length, rng)
    if (/[A-Z]/.test(candidate) && /[a-z]/.test(candidate) && /[2-9]/.test(candidate))
      return candidate
  }
}
