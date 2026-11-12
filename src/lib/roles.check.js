import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ROLES, ROLE_LABELS, buildUser, manageableRoles, permissionsFor } from './roles.js'

test('ada 8 role dan tidak ada superadmin', () => {
  assert.equal(ROLES.length, 8)
  assert.ok(!ROLES.includes('superadmin'))
})

test('label tampilan', () => {
  assert.equal(ROLE_LABELS.sales, 'Sales and Data')
  assert.equal(ROLE_LABELS.konten, 'Content and Branding')
})

test('admin mengelola semua role', () => {
  assert.deepEqual(manageableRoles('admin'), ROLES)
})

test('spv hanya mengelola staf di bawahnya', () => {
  assert.deepEqual(manageableRoles('spv'), ['ts', 'mo', 'cs', 'sales', 'konten', 'intern'])
})

test('hanya admin dan spv yang bisa mengelola pengguna', () => {
  for (const role of ROLES) {
    assert.equal(permissionsFor(role).manage_users, role === 'admin' || role === 'spv', role)
  }
})

test('semua role selain intern bisa menulis FAQ, saran, SKU, wiring, dan datasheet', () => {
  for (const role of ROLES) {
    const p = permissionsFor(role)
    const expected = role !== 'intern'
    assert.equal(p.write_faq, expected, role)
    assert.equal(p.write_selling, expected, role)
    assert.equal(p.write_products, expected, role)
  }
})

test('buildUser membentuk objek seperti UserResource backend', () => {
  const user = buildUser({ id: 4, role: 'cs' })
  assert.equal(user.email, 'cs@servolta.test')
  assert.equal(user.role_label, 'Customer Service')
  assert.ok('permissions' in user)
})
