"use strict";
/**
 * Permissions & Authorization Utilities
 * Defines role-based access control (RBAC) and permission helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_HIERARCHY = void 0;
exports.hasRoleLevel = hasRoleLevel;
exports.isAdminOrOwner = isAdminOrOwner;
exports.isOwner = isOwner;
exports.getAssignableRoles = getAssignableRoles;
/**
 * Permission levels
 * - OWNER: Full system access (multiple buildings)
 * - ADMIN: Building-level admin (one or more buildings)
 * - BOARD_MEMBER: Can view building info, read-only
 * - USER: Limited access (only own apartment/profile)
 */
exports.ROLE_HIERARCHY = {
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
function hasRoleLevel(userRole, requiredRole) {
    return exports.ROLE_HIERARCHY[userRole] >= exports.ROLE_HIERARCHY[requiredRole];
}
/**
 * Check if user is admin or owner
 */
function isAdminOrOwner(role) {
    return role === 'ADMIN' || role === 'OWNER';
}
/**
 * Check if user is owner
 */
function isOwner(role) {
    return role === 'OWNER';
}
/**
 * Get available roles for a user to assign to others
 * OWNER can assign any role, ADMIN can only assign below their level
 */
function getAssignableRoles(userRole) {
    if (userRole === 'OWNER') {
        return ['ADMIN', 'BOARD_MEMBER', 'USER'];
    }
    if (userRole === 'ADMIN') {
        return ['BOARD_MEMBER', 'USER'];
    }
    return [];
}
//# sourceMappingURL=permissions.js.map