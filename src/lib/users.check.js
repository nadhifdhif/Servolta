import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeEmail, validateUser } from './users.js'

const ok = {
  name: 'Orang Baru',
  email: 'baru@servolta.test',
  role: 'cs',
  password: 'sandi-panjang-1',
}

test('normalizeEmail', () => {
  assert.equal(normalizeEmail('  Baru@Servolta.TEST '), 'baru@servolta.test')
  assert.equal(normalizeEmail(undefined), '')
})

test('data sah', () => {
  assert.deepEqual(validateUser(ok, { actorRole: 'spv' }), {})
  assert.deepEqual(validateUser(ok, { actorRole: 'admin' }), {})
})

test('nama, email, dan kata sandi', () => {
  const ctx = { actorRole: 'admin' }
  assert.ok(validateUser({ ...ok, name: ' ' }, ctx).name)
  assert.ok(validateUser({ ...ok, name: 'x'.repeat(101) }, ctx).name)
  assert.ok(validateUser({ ...ok, email: '' }, ctx).email)
  assert.ok(validateUser({ ...ok, email: 'tidak-valid' }, ctx).email)
  assert.ok(validateUser({ ...ok, password: '' }, ctx).password)
  assert.match(validateUser({ ...ok, password: 'pendek' }, ctx).password[0], /minimal 8/)
})

test('email kembar dicek tanpa peka huruf besar/kecil', () => {
  const errors = validateUser(
    { ...ok, email: ' BARU@servolta.test ' },
    { actorRole: 'admin', otherEmails: ['baru@servolta.test'] },
  )
  assert.match(errors.email[0], /sudah dipakai/)
})

test('supervisor tidak boleh memberi role spv atau admin; admin boleh semua', () => {
  for (const role of ['spv', 'admin']) {
    assert.ok(validateUser({ ...ok, role }, { actorRole: 'spv' }).role, role)
    assert.deepEqual(validateUser({ ...ok, role }, { actorRole: 'admin' }), {})
  }
  assert.deepEqual(validateUser({ ...ok, role: 'konten' }, { actorRole: 'spv' }), {})
  assert.ok(validateUser({ ...ok, role: '' }, { actorRole: 'spv' }).role)
  assert.ok(validateUser({ ...ok, role: 'superadmin' }, { actorRole: 'admin' }).role)
})

test('saat mengubah, kata sandi kosong berarti tidak diganti, tapi tetap dicek bila diisi', () => {
  const ctx = { actorRole: 'spv', isEdit: true }
  assert.deepEqual(validateUser({ ...ok, password: '' }, ctx), {})
  assert.ok(validateUser({ ...ok, password: 'pendek' }, ctx).password)
})
