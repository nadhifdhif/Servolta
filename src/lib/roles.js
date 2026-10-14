// Cermin dari app/Enums/UserRole.php di backend. Di mode asli, FE memakai
// `user.permissions` dari /api/me; file ini dipakai oleh mode mock.

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  spv: 'Supervisor',
  cs: 'Customer Service',
  ts: 'Technical Support',
  mo: 'Marketing Officer',
  sales: 'Sales',
  konten: 'Konten',
  intern: 'Intern',
}

export const ROLES = Object.keys(ROLE_LABELS)

export function manageableRoles(role) {
  if (role === 'superadmin') return [...ROLES]
  if (role === 'admin') return ROLES.filter((r) => r !== 'superadmin')
  if (role === 'spv') return ['cs', 'ts', 'mo', 'sales', 'konten', 'intern']
  return []
}

export function permissionsFor(role) {
  return {
    manage_users: manageableRoles(role).length > 0,
    write_faq: role !== 'intern',
    write_products: ['superadmin', 'admin', 'spv'].includes(role),
  }
}

export function buildUser({ id, role }) {
  return {
    id,
    name: ROLE_LABELS[role],
    email: `${role}@servolta.test`,
    role,
    role_label: ROLE_LABELS[role],
    is_active: true,
    permissions: permissionsFor(role),
  }
}
