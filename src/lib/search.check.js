import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MOCK_PRODUCTS } from '../api/mockData.js'
import { levenshtein, normalize, searchProducts } from './search.js'

const skus = (results) => results.map((r) => r.product.sku)

test('normalize: huruf kecil, tanpa tanda baca/diakritik', () => {
  assert.equal(normalize('  SVR-1000 / Stabilizér  '), 'svr 1000 stabilizer')
})

test('levenshtein dasar', () => {
  assert.equal(levenshtein('stabilizer', 'stabiliser'), 1)
  assert.equal(levenshtein('abc', 'abc'), 0)
  assert.equal(levenshtein('', 'abc'), 3)
})

test('SKU persis menempati urutan pertama', () => {
  assert.equal(searchProducts(MOCK_PRODUCTS, 'svr-1000')[0].product.sku, 'SVR-1000')
  assert.equal(searchProducts(MOCK_PRODUCTS, 'SVR1000')[0].product.sku, 'SVR-1000')
})

test('awalan SKU menampilkan beberapa kandidat', () => {
  assert.deepEqual(skus(searchProducts(MOCK_PRODUCTS, 'ups')).slice(0, 2).sort(), ['UPS-1200', 'UPS-650'])
})

test('nama sebagian kata', () => {
  assert.ok(skus(searchProducts(MOCK_PRODUCTS, 'router')).includes('RTR-AX18'))
  assert.ok(skus(searchProducts(MOCK_PRODUCTS, 'dome cctv')).includes('CAM-D2'))
})

test('salah ketik tetap ditemukan (fuzzy)', () => {
  const hasil = searchProducts(MOCK_PRODUCTS, 'stabiliser servo')
  assert.ok(skus(hasil).includes('SVR-1000'))
  assert.equal(hasil[0].fuzzy, true)
  assert.ok(skus(searchProducts(MOCK_PRODUCTS, 'rooter')).includes('RTR-AX18'))
})

test('angka harus persis: 1000 tidak cocok dengan 2000', () => {
  const hasil = skus(searchProducts(MOCK_PRODUCTS, 'svr 1000'))
  assert.ok(hasil.includes('SVR-1000'))
  assert.ok(!hasil.includes('SVR-2000'))
})

test('tidak ada hasil untuk kata tak terkait', () => {
  assert.equal(searchProducts(MOCK_PRODUCTS, 'xylophone').length, 0)
})

test('mode loose memberi saran "Maksud Anda" untuk salah ketik berat', () => {
  // Terlalu jauh untuk pencarian biasa, tetapi tertangkap oleh mode saran.
  assert.equal(searchProducts(MOCK_PRODUCTS, 'stbilzr').length, 0)
  assert.ok(skus(searchProducts(MOCK_PRODUCTS, 'stbilzr', { loose: true })).includes('SVR-1000'))
  assert.ok(skus(searchProducts(MOCK_PRODUCTS, 'kamra', { loose: true })).includes('CAM-D2'))
})

test('query kosong mengembalikan daftar awal sesuai limit', () => {
  assert.equal(searchProducts(MOCK_PRODUCTS, '', { limit: 3 }).length, 3)
  assert.equal(searchProducts(MOCK_PRODUCTS, '   ').length, MOCK_PRODUCTS.length)
})
