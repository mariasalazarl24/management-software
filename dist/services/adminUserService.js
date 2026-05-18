"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUserService = void 0;
exports.sanitizeAdminUser = sanitizeAdminUser;
const db_1 = require("../db");
const password_1 = require("../utils/password");
const adminAuth_1 = require("../middleware/adminAuth");
exports.adminUserService = {
    /**
     * Create a new admin user
     */
    async create(data) {
        // Check if email already exists
        const existingUser = await db_1.prisma.buildHubAdminUser.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new Error('Email already in use');
        }
        // Validate role
        const validRoles = ['SUPERADMIN', 'ADMIN_DASHBOARD'];
        if (!validRoles.includes(data.role)) {
            throw new Error('Invalid admin role');
        }
        // Hash password
        const hashedPassword = await (0, password_1.hashPassword)(data.password);
        // Create user
        const user = await db_1.prisma.buildHubAdminUser.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
                status: 'ACTIVE',
            },
        });
        // Return user without password
        return this.sanitizeUser(user);
    },
    /**
     * Authenticate admin user and return tokens
     */
    async login(data) {
        // Find user by email
        const user = await db_1.prisma.buildHubAdminUser.findUnique({
            where: { email: data.email },
        });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        // Check if account is active
        if (user.status !== 'ACTIVE') {
            throw new Error('Account is inactive');
        }
        // Verify password
        const isPasswordValid = await (0, password_1.comparePassword)(data.password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }
        // Generate tokens
        const tokens = (0, adminAuth_1.generateAdminTokenPair)({
            adminId: user.id,
            email: user.email,
            role: user.role,
        });
        return {
            ...tokens,
            admin: this.sanitizeUser(user),
        };
    },
    /**
     * Get admin user by ID
     */
    async getById(adminId) {
        const user = await db_1.prisma.buildHubAdminUser.findUnique({
            where: { id: adminId },
        });
        if (!user) {
            throw new Error('Admin user not found');
        }
        return this.sanitizeUser(user);
    },
    /**
     * List all admin users
     */
    async listAll(limit = 50, offset = 0) {
        const users = await db_1.prisma.buildHubAdminUser.findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        const total = await db_1.prisma.buildHubAdminUser.count();
        return {
            data: users,
            pagination: {
                limit,
                offset,
                total,
            },
        };
    },
    /**
     * Update admin user
     */
    async update(adminId, updates) {
        // Check if user exists
        const user = await db_1.prisma.buildHubAdminUser.findUnique({
            where: { id: adminId },
        });
        if (!user) {
            throw new Error('Admin user not found');
        }
        // Validate role if provided
        if (updates.role) {
            const validRoles = ['SUPERADMIN', 'ADMIN_DASHBOARD'];
            if (!validRoles.includes(updates.role)) {
                throw new Error('Invalid admin role');
            }
        }
        // Update user
        const updatedUser = await db_1.prisma.buildHubAdminUser.update({
            where: { id: adminId },
            data: {
                firstName: updates.firstName,
                lastName: updates.lastName,
                role: updates.role,
                status: updates.status,
            },
        });
        return this.sanitizeUser(updatedUser);
    },
    /**
     * Reset admin user password (by another admin)
     * Logs the action to PasswordResetLog
     */
    async resetPassword(userId, newPassword, resetByAdminId) {
        // Check if user exists
        const user = await db_1.prisma.buildHubAdminUser.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('Admin user not found');
        }
        // Hash new password
        const hashedPassword = await (0, password_1.hashPassword)(newPassword);
        // Update password
        await db_1.prisma.buildHubAdminUser.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        // Log the password reset (if PasswordResetLog has admin support)
        try {
            await db_1.prisma.passwordResetLog.create({
                data: {
                    resetById: resetByAdminId,
                    resetByRole: 'ADMIN',
                    userEmail: user.email,
                    userRole: 'ADMIN',
                },
            });
        }
        catch (error) {
            // Silently fail if logging is not available
            console.warn('Could not log password reset');
        }
        return { success: true, message: 'Password reset successfully' };
    },
    /**
     * Deactivate admin user
     */
    async deactivate(adminId) {
        const user = await db_1.prisma.buildHubAdminUser.findUnique({
            where: { id: adminId },
        });
        if (!user) {
            throw new Error('Admin user not found');
        }
        const updated = await db_1.prisma.buildHubAdminUser.update({
            where: { id: adminId },
            data: { status: 'INACTIVE' },
        });
        return this.sanitizeUser(updated);
    },
    /**
     * Reactivate admin user
     */
    async reactivate(adminId) {
        const user = await db_1.prisma.buildHubAdminUser.findUnique({
            where: { id: adminId },
        });
        if (!user) {
            throw new Error('Admin user not found');
        }
        const updated = await db_1.prisma.buildHubAdminUser.update({
            where: { id: adminId },
            data: { status: 'ACTIVE' },
        });
        return this.sanitizeUser(updated);
    },
    /**
     * Remove password from user object for safe return
     */
    sanitizeUser(user) {
        const { password, ...sanitized } = user;
        return sanitized;
    },
};
// Helper function to sanitize user
function sanitizeAdminUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
}
//# sourceMappingURL=adminUserService.js.map