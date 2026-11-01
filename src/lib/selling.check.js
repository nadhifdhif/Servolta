import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countByType, validateSelling } from './selling.js'

const products = [{ id: 1 }, { id: 2 }, { id: 3 }]
const ctx = (existing = []) => ({ productId: 1, products, existing })
const ok = { type: 'upsell', target_id: 2, pitch: 'Tipe lebih besar.' }

test('data sah tidak menghasilkan kesalahan', () => {
  assert.deepEqual(validateSelling(ok, ctx()), {})
  assert.deepEqual(validateSelling({ ...ok, type: 'cross', target_id: '3' }, ctx()), {})
})

test('jenis, tujuan, dan pesan divalidasi', () => {
  assert.ok(validateSelling({ ...ok, type: 'lain' }, ctx()).type)
  assert.ok(validateSelling({ ...ok, target_id: '' }, ctx()).target_id)
  assert.ok(validateSelling({ ...ok, target_id: 1 }, ctx()).target_id)
  assert.ok(validateSelling({ ...ok, target_id: 99 }, ctx()).target_id)
  assert.ok(validateSelling({ ...ok, pitch: '   ' }, ctx()).pitch)
  assert.ok(validateSelling({ ...ok, pitch: 'x'.repeat(1001) }, ctx()).pitch)
})

test('tujuan yang sama pada jenis yang sama ditolak, jenis berbeda boleh', () => {
  const existing = [{ id: 7, type: 'upsell', target_id: 2 }]
  assert.ok(validateSelling(ok, ctx(existing)).target_id)
  assert.deepEqual(validateSelling({ ...ok, type: 'cross' }, ctx(existing)), {})
})

test('countByType', () => {
  assert.deepEqual(countByType([{ type: 'upsell' }, { type: 'cross' }, { type: 'cross' }]), {
    upsell: 1,
    cross: 2,
  })
  assert.deepEqual(countByType([]), { upsell: 0, cross: 0 })
})
