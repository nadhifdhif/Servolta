import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firstName, greetingFor } from './greeting.js'
import { parseRecent, pushRecent } from './recent.js'

const p = (id) => ({ id, sku: `SKU-${id}`, name: `Produk ${id}` })

test('sapaan menurut jam', () => {
  assert.equal(greetingFor(5), 'Selamat pagi')
  assert.equal(greetingFor(11), 'Selamat siang')
  assert.equal(greetingFor(15), 'Selamat sore')
  assert.equal(greetingFor(18), 'Selamat malam')
  assert.equal(greetingFor(0), 'Selamat pagi')
})

test('nama depan', () => {
  assert.equal(firstName('Citra Maharani'), 'Citra')
  assert.equal(firstName('  Intan  '), 'Intan')
  assert.equal(firstName(''), '')
  assert.equal(firstName(undefined), '')
})

test('pushRecent: terbaru di depan, tanpa duplikat, maksimal 3', () => {
  let list = []
  for (const id of [1, 2, 3]) list = pushRecent(list, p(id))
  assert.deepEqual(
    list.map((x) => x.id),
    [3, 2, 1],
  )
  list = pushRecent(list, p(2))
  assert.deepEqual(
    list.map((x) => x.id),
    [2, 3, 1],
  )
  list = pushRecent(list, p(4))
  assert.deepEqual(
    list.map((x) => x.id),
    [4, 2, 3],
  )
})

test('pushRecent hanya menyimpan id, sku, dan nama', () => {
  const [item] = pushRecent([], { ...p(1), faq: [1, 2, 3], rahasia: 'x' })
  assert.deepEqual(Object.keys(item).sort(), ['id', 'name', 'sku'])
})

test('parseRecent menyaring data rusak', () => {
  assert.deepEqual(parseRecent(null), [])
  assert.deepEqual(parseRecent('bukan json'), [])
  assert.deepEqual(parseRecent('{"a":1}'), [])
  const raw = JSON.stringify([p(1), { id: 'x', sku: 1 }, null, p(2), p(3), p(4)])
  assert.deepEqual(
    parseRecent(raw).map((x) => x.id),
    [1, 2, 3],
  )
})
