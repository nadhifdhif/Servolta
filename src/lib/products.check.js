import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanSpecs, normalizeSku, validateProduct } from './products.js'

test('normalizeSku: huruf besar dan tanpa spasi tepi', () => {
  assert.equal(normalizeSku('  svr-1000 '), 'SVR-1000')
  assert.equal(normalizeSku(undefined), '')
})

test('validateProduct: SKU', () => {
  assert.deepEqual(validateProduct({ sku: 'svr-3000', name: 'Stabilizer' }), {})
  assert.deepEqual(validateProduct({ sku: 'A.1_b/2', name: 'x' }), {})
  assert.ok(validateProduct({ sku: '', name: 'x' }).sku)
  assert.ok(validateProduct({ sku: 'bad sku!', name: 'x' }).sku)
  assert.ok(validateProduct({ sku: '-A', name: 'x' }).sku)
  assert.ok(validateProduct({ sku: 'A'.repeat(51), name: 'x' }).sku)
  assert.match(
    validateProduct({ sku: 'svr-1000', name: 'x' }, ['SVR-1000']).sku[0],
    /sudah dipakai/,
  )
})

test('validateProduct: nama dan spesifikasi', () => {
  assert.ok(validateProduct({ sku: 'A1', name: '  ' }).name)
  assert.ok(validateProduct({ sku: 'A1', name: 'x'.repeat(151) }).name)
  assert.ok(validateProduct({ sku: 'A1', name: 'x', specs: [{ label: 'Berat', value: '' }] }).specs)
  assert.deepEqual(validateProduct({ sku: 'A1', name: 'x', specs: [{ label: '', value: '' }] }), {})
  assert.ok(
    validateProduct({ sku: 'A1', name: 'x', specs: Array(41).fill({ label: 'a', value: 'b' }) })
      .specs,
  )
})

test('cleanSpecs: membuang baris kosong, menandai baris setengah terisi', () => {
  assert.deepEqual(
    cleanSpecs([
      { label: ' Berat ', value: ' 9 kg ' },
      { label: '', value: '' },
    ]),
    {
      specs: [['Berat', '9 kg']],
      incomplete: false,
    },
  )
  assert.equal(cleanSpecs([{ label: 'x', value: '' }]).incomplete, true)
  assert.deepEqual(cleanSpecs(undefined), { specs: [], incomplete: false })
})
