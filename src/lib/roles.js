// Cermin dari app/Enums/UserRole.php di backend (empat role: admin, spv, staff, intern). Di mode asli, FE memakai
// `user.permissions` dari /api/me; file ini dipakai oleh mode mock.

export const ROLE_LABELS = {
  admin: 'Admin',
  spv: 'Supervisor',
  staff: 'Staff',
  intern: 'Intern',
}

export const ROLES = Object.keys(ROLE_LABELS)

// Admin mengelola semua role; Supervisor hanya Staff dan Intern.
export function manageableRoles(role) {
  if (role === 'admin') return [...ROLES]
  if (role === 'spv') return ['staff', 'intern']
  return []
}

// Semua role selain Intern boleh menulis. Intern hanya melihat.
export function permissionsFor(role) {
  const canWrite = role !== 'intern'
  return {
    manage_users: manageableRoles(role).length > 0,
    write_faq: canWrite,
    write_selling: canWrite, // upselling & cross selling
    write_products: canWrite, // SKU, spesifikasi, wiring, datasheet
    view_logs: role === 'admin', // riwayat percobaan masuk
  }
}

export function buildUser({ id, role }) {
  return {
    id,
    name: ROLE_LABELS[role],
    login_code: `${role.toUpperCase()}01`,
    role,
    role_label: ROLE_LABELS[role],
    is_active: true,
    permissions: permissionsFor(role),
  }
}
