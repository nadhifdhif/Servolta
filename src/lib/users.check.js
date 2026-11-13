import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validatePasswordChange, validateUser } from './users.js'

const ok = { name: 'Orang Baru', login_code: 'K7M2Q9XA', role: 'cs', password: 'sandi-sementara-1' }

test('data sah', () => {
  assert.deepEqual(validateUser(ok, { actorRole: 'spv' }), {})
  assert.deepEqual(validateUser(ok, { actorRole: 'admin' }), {})
  assert.deepEqual(validateUser({ ...ok, login_code: ' k7m2q9xa ' }, { actorRole: 'admin' }), {})
})

test('nama, kode, dan kata sandi', () => {
  const ctx = { actorRole: 'admin' }
  assert.ok(validateUser({ ...ok, name: ' ' }, ctx).name)
  assert.ok(validateUser({ ...ok, name: 'x'.repeat(101) }, ctx).name)
  assert.ok(validateUser({ ...ok, login_code: '' }, ctx).login_code)
  assert.ok(validateUser({ ...ok, login_code: 'AB1' }, ctx).login_code)
  assert.ok(validateUser({ ...ok, login_code: 'ADA SPASI' }, ctx).login_code)
  assert.ok(validateUser({ ...ok, password: '' }, ctx).password)
  assert.match(validateUser({ ...ok, password: 'pendek123' }, ctx).password[0], /minimal 10/)
})

test('kode kembar dicek tanpa peka huruf besar/kecil', () => {
  const errors = validateUser(ok, { actorRole: 'admin', otherCodes: ['k7m2q9xa'] })
  assert.match(errors.login_code[0], /sudah dipakai/)
})

test('ID karyawan: opsional, harus angka, unik', () => {
  const ctx = { actorRole: 'admin', otherEmployeeIds: [10234, '555'] }
  assert.deepEqual(validateUser({ ...ok, employee_id: '' }, ctx), {})
  assert.deepEqual(validateUser({ ...ok, employee_id: null }, ctx), {})
  assert.deepEqual(validateUser({ ...ok, employee_id: '4521' }, ctx), {})
  assert.ok(validateUser({ ...ok, employee_id: 'abc' }, ctx).employee_id)
  assert.ok(validateUser({ ...ok, employee_id: '12.5' }, ctx).employee_id)
  assert.ok(validateUser({ ...ok, employee_id: '0' }, ctx).employee_id)
  assert.ok(validateUser({ ...ok, employee_id: '99999999999' }, ctx).employee_id)
  assert.match(validateUser({ ...ok, employee_id: '10234' }, ctx).employee_id[0], /sudah terdaftar/)
  assert.match(validateUser({ ...ok, employee_id: 555 }, ctx).employee_id[0], /sudah terdaftar/)
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

test('ganti sandi sendiri', () => {
  const good = {
    current_password: 'sandi-lama-123',
    password: 'sandi-baru-4567',
    password_confirmation: 'sandi-baru-4567',
  }
  assert.deepEqual(validatePasswordChange(good), {})
  assert.ok(validatePasswordChange({ ...good, current_password: '' }).current_password)
  assert.ok(
    validatePasswordChange({ ...good, password: 'pendek', password_confirmation: 'pendek' })
      .password,
  )
  assert.ok(
    validatePasswordChange({ ...good, password_confirmation: 'beda-sekali-1' })
      .password_confirmation,
  )
  assert.match(
    validatePasswordChange({
      ...good,
      password: 'sandi-lama-123',
      password_confirmation: 'sandi-lama-123',
    }).password[0],
    /berbeda/,
  )
})
