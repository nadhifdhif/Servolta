import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ROLES, ROLE_LABELS, buildUser, manageableRoles, permissionsFor } from './roles.js'

test('ada 4 role: admin, spv, staff, intern', () => {
  assert.deepEqual(ROLES, ['admin', 'spv', 'staff', 'intern'])
  for (const old of ['superadmin', 'ts', 'mo', 'cs', 'sales', 'konten']) {
    assert.ok(!ROLES.includes(old), old)
  }
})

test('label tampilan', () => {
  assert.deepEqual(ROLE_LABELS, {
    admin: 'Admin',
    spv: 'Supervisor',
    staff: 'Staff',
    intern: 'Intern',
  })
})

test('admin mengelola semua role', () => {
  assert.deepEqual(manageableRoles('admin'), ROLES)
})

test('spv hanya mengelola staff dan intern', () => {
  assert.deepEqual(manageableRoles('spv'), ['staff', 'intern'])
})

test('staff dan intern tidak mengelola siapa pun', () => {
  assert.deepEqual(manageableRoles('staff'), [])
  assert.deepEqual(manageableRoles('intern'), [])
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
  const user = buildUser({ id: 4, role: 'staff' })
  assert.equal(user.login_code, 'STAFF01')
  assert.ok(!('email' in user))
  assert.equal(user.role_label, 'Staff')
  assert.ok('permissions' in user)
})
