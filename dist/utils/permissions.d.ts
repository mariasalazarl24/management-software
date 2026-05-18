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
export declare const ROLE_HIERARCHY: Record<UserRole, number>;
/**
 * Check if user has at least the required role level
 * @param userRole - User's actual role
 * @param requiredRole - Minimum required role
 * @returns true if user has sufficient permissions
 */
export declare function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean;
/**
 * Check if user is admin or owner
 */
export declare function isAdminOrOwner(role: UserRole): boolean;
/**
 * Check if user is owner
 */
export declare function isOwner(role: UserRole): boolean;
/**
 * Get available roles for a user to assign to others
 * OWNER can assign any role, ADMIN can only assign below their level
 */
export declare function getAssignableRoles(userRole: UserRole): UserRole[];
//# sourceMappingURL=permissions.d.ts.map