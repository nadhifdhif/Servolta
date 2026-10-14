import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ROLES, buildUser, manageableRoles, permissionsFor } from './roles.js'

test('ada 9 role', () => {
  assert.equal(ROLES.length, 9)
})

test('superadmin mengelola semua role; admin tidak mengelola superadmin', () => {
  assert.equal(manageableRoles('superadmin').length, 9)
  assert.ok(!manageableRoles('admin').includes('superadmin'))
  assert.equal(manageableRoles('admin').length, 8)
})

test('spv hanya mengelola staf di bawahnya', () => {
  assert.deepEqual(manageableRoles('spv'), ['cs', 'ts', 'mo', 'sales', 'konten', 'intern'])
})

test('staf biasa tidak bisa mengelola user', () => {
  for (const role of ['cs', 'ts', 'mo', 'sales', 'konten', 'intern']) {
    assert.equal(permissionsFor(role).manage_users, false)
  }
})

test('hak tulis FAQ dan produk', () => {
  assert.equal(permissionsFor('cs').write_faq, true)
  assert.equal(permissionsFor('intern').write_faq, false)
  assert.equal(permissionsFor('spv').write_products, true)
  assert.equal(permissionsFor('cs').write_products, false)
})

test('buildUser membentuk objek seperti UserResource backend', () => {
  const user = buildUser({ id: 4, role: 'cs' })
  assert.equal(user.email, 'cs@servolta.test')
  assert.equal(user.role_label, 'Customer Service')
  assert.ok('permissions' in user)
})
