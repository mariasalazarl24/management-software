/**
 * Permissions & Authorization Utilities
 * Defines role-based access control (RBAC) and permission helpers
 */

export type UserRole = 'OWNER' | 'ADMIN' | 'BOARD_MEMBER' | 'USER';

/**
 * Permission levels
 * - OWNER: Full system access (multiple buildings)
 * - ADMIN: Building-level admin (one or more buildings)
 * - BOARD_MEMBER: Can view building info, read-only
 * - USER: Limited access (only own apartment/profile)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  BOARD_MEMBER: 2,
  USER: 1,
};

/**
 * Check if user has at least the required role level
 * @param userRole - User's actual role
 * @param requiredRole - Minimum required role
 * @returns true if user has sufficient permissions
 */
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user is admin or owner
 */
export function isAdminOrOwner(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'OWNER';
}

/**
 * Check if user is owner
 */
export function isOwner(role: UserRole): boolean {
  return role === 'OWNER';
}

/**
 * Get available roles for a user to assign to others
 * OWNER can assign any role, ADMIN can only assign below their level
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  if (userRole === 'OWNER') {
    return ['ADMIN', 'BOARD_MEMBER', 'USER'];
  }
  if (userRole === 'ADMIN') {
    return ['BOARD_MEMBER', 'USER'];
  }
  return [];
}
