export const SELLING_TYPES = {
  upsell: {
    label: 'Upselling',
    hint: 'Tawarkan tipe yang lebih tinggi dari produk ini.',
    empty: 'Belum ada saran upselling untuk produk ini.',
  },
  cross: {
    label: 'Cross selling',
    hint: 'Tawarkan produk pendamping yang biasanya dibeli bersamaan.',
    empty: 'Belum ada saran cross selling untuk produk ini.',
  },
}

export const SELLING_TYPE_KEYS = Object.keys(SELLING_TYPES)

export const PITCH_MAX = 1000

// Mengembalikan { kolom: [pesan] }; objek kosong berarti data sah.
// `existing` = entri lain milik produk yang sama (tanpa entri yang sedang diubah).
export function validateSelling(payload, { productId, products, existing = [] }) {
  const errors = {}
  if (!SELLING_TYPE_KEYS.includes(payload.type)) errors.type = ['Jenis tidak valid.']

  const targetId = Number(payload.target_id)
  if (!payload.target_id || !Number.isInteger(targetId)) {
    errors.target_id = ['Pilih produk tujuan.']
  } else if (targetId === productId) {
    errors.target_id = ['Produk tujuan tidak boleh sama dengan produk ini.']
  } else if (!products.some((p) => p.id === targetId)) {
    errors.target_id = ['Produk tujuan tidak ditemukan.']
  } else if (existing.some((e) => e.type === payload.type && e.target_id === targetId)) {
    errors.target_id = ['Produk ini sudah ada di daftar.']
  }

  const pitch = String(payload.pitch ?? '').trim()
  if (!pitch) errors.pitch = ['Pesan untuk customer wajib diisi.']
  else if (pitch.length > PITCH_MAX) errors.pitch = [`Maksimal ${PITCH_MAX} karakter.`]
  return errors
}

export function countByType(entries) {
  return {
    upsell: entries.filter((e) => e.type === 'upsell').length,
    cross: entries.filter((e) => e.type === 'cross').length,
  }
}
