export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._\-/]*$/

export const normalizeSku = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

// Baris spesifikasi kosong (dua kolom kosong) dibuang; baris setengah terisi dianggap salah.
export function cleanSpecs(rows) {
  const filled = []
  let incomplete = false
  for (const row of rows ?? []) {
    const label = String(row?.label ?? '').trim()
    const value = String(row?.value ?? '').trim()
    if (!label && !value) continue
    if (!label || !value) incomplete = true
    else filled.push([label, value])
  }
  return { specs: filled, incomplete }
}

// Mengembalikan { kolom: [pesan] }; objek kosong berarti sah.
export function validateProduct(payload, existingSkus = []) {
  const errors = {}
  const sku = normalizeSku(payload.sku)
  if (!sku) errors.sku = ['SKU wajib diisi.']
  else if (sku.length > 50) errors.sku = ['SKU maksimal 50 karakter.']
  else if (!SKU_PATTERN.test(sku)) {
    errors.sku = ['SKU hanya boleh huruf, angka, titik, garis bawah, strip, dan garis miring.']
  } else if (existingSkus.map(normalizeSku).includes(sku)) {
    errors.sku = ['SKU ini sudah dipakai produk lain.']
  }

  const name = String(payload.name ?? '').trim()
  if (!name) errors.name = ['Nama produk wajib diisi.']
  else if (name.length > 150) errors.name = ['Nama produk maksimal 150 karakter.']

  const { incomplete } = cleanSpecs(payload.specs)
  if (incomplete) errors.specs = ['Setiap baris spesifikasi harus punya nama dan nilai.']
  if ((payload.specs ?? []).length > 40) errors.specs = ['Maksimal 40 baris spesifikasi.']
  return errors
}
