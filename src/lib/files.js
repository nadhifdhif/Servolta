export const WIRING_EXT = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'svg',
  'heic',
  'heif',
  'bmp',
  'tif',
  'tiff',
  'avif',
]
export const WIRING_MAX = 15 * 1024 * 1024
export const DATASHEET_MAX = 20 * 1024 * 1024

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function extOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name ?? ''))
  return match ? match[1].toLowerCase() : ''
}

export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Tanggal "YYYY-MM-DD" ditulis ulang tanpa Date supaya tidak bergeser oleh zona waktu.
export function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''))
  if (!match) return ''
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${Number(match[3])} ${month} ${match[1]}` : ''
}

export function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Mengembalikan pesan kesalahan, atau null bila file boleh diunggah.
// Pemeriksaan ini hanya kemudahan di browser; backend tetap harus memeriksa isi file.
export function validateUpload(kind, file) {
  if (!file) return 'Pilih file terlebih dahulu.'
  if (!file.size) return 'File kosong.'
  const ext = extOf(file.name)
  if (kind === 'wiring') {
    if (!WIRING_EXT.includes(ext))
      return 'Format belum didukung. Gunakan JPG, PNG, WebP, GIF, SVG, atau HEIC.'
    if (file.size > WIRING_MAX) return 'Ukuran gambar maksimal 15 MB.'
    return null
  }
  if (kind === 'datasheet') {
    if (ext !== 'pdf') return 'Datasheet harus berupa file PDF.'
    if (file.size > DATASHEET_MAX) return 'Ukuran PDF maksimal 20 MB.'
    return null
  }
  return 'Jenis dokumen tidak dikenal.'
}

export function fileSlug(text) {
  return (
    String(text ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file'
  )
}
