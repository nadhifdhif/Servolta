// Pencarian produk berdasarkan SKU atau nama, toleran terhadap salah ketik.
// Murni JavaScript (tanpa Vue/Vite) supaya mudah dites.

export function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[b.length]
}

function maxDistFor(token, loose) {
  // Token yang mengandung angka (mis. 1000, AX1800) harus persis: 1000VA != 2000VA.
  if (/\d/.test(token)) return 0
  const len = token.length
  if (len <= 3) return loose ? 1 : 0
  if (len <= 6) return loose ? 2 : 1
  return loose ? 3 : 2
}

function tokenDistance(queryToken, targets) {
  let best = Infinity
  for (const target of targets) {
    if (target.startsWith(queryToken)) return 0
    if (queryToken.length >= 3 && target.includes(queryToken)) return 0
    best = Math.min(
      best,
      levenshtein(queryToken, target),
      // toleransi untuk kata yang belum selesai diketik
      levenshtein(queryToken, target.slice(0, queryToken.length)),
    )
  }
  return best
}

/**
 * @param {{id:number, sku:string, name:string}[]} products
 * @param {string} query
 * @param {{limit?:number, loose?:boolean}} options  loose=true dipakai untuk saran "Maksud Anda"
 * @returns {{product:object, score:number, fuzzy:boolean}[]}
 */
export function searchProducts(products, query, { limit = 8, loose = false } = {}) {
  const q = normalize(query)

  if (!q) {
    return products.slice(0, limit).map((product) => ({ product, score: 0, fuzzy: false }))
  }

  const qCompact = q.replace(/ /g, '')
  const qTokens = q.split(' ')
  const results = []

  for (const product of products) {
    const skuCompact = normalize(product.sku).replace(/ /g, '')
    const name = normalize(product.name)
    let score = 0
    let fuzzy = false

    if (skuCompact === qCompact) score = 100
    else if (skuCompact.startsWith(qCompact)) score = 90
    else if (name.startsWith(q)) score = 85
    else if (qCompact.length >= 2 && skuCompact.includes(qCompact)) score = 75
    else {
      const targets = [...name.split(' '), ...normalize(product.sku).split(' '), skuCompact]
      let total = 0
      let ok = true
      for (const token of qTokens) {
        const distance = tokenDistance(token, targets)
        if (distance > maxDistFor(token, loose)) {
          ok = false
          break
        }
        total += distance
      }
      if (ok) {
        fuzzy = total > 0
        score = total === 0 ? 70 : Math.max(10, 50 - total * 5)
      }
    }

    if (score > 0) results.push({ product, score, fuzzy })
  }

  results.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
  return results.slice(0, limit)
}
