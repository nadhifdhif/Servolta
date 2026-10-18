// Daftar "terakhir dilihat": produk terbaru di depan, tanpa duplikat, maksimal 3.
export const RECENT_KEY = 'servolta_recent'
const MAX = 3

export function pushRecent(list, product, max = MAX) {
  const item = { id: product.id, sku: product.sku, name: product.name }
  return [item, ...list.filter((p) => p.id !== product.id)].slice(0, max)
}

// Data dari localStorage tidak dipercaya begitu saja: saring bentuknya.
export function parseRecent(raw) {
  try {
    const value = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value
      .filter(
        (p) =>
          p && Number.isFinite(p.id) && typeof p.sku === 'string' && typeof p.name === 'string',
      )
      .map((p) => ({ id: p.id, sku: p.sku, name: p.name }))
      .slice(0, MAX)
  } catch {
    return []
  }
}
