"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const adminUserService_1 = require("../../services/adminUserService");
const adminAuth_1 = require("../../middleware/adminAuth");
const password_1 = require("../../utils/password");
const router = (0, express_1.Router)();
/**
 * Validation Schemas
 */
const createAdminUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    role: zod_1.z.enum(['SUPERADMIN', 'ADMIN_DASHBOARD']),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const updateAdminUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100).optional(),
    lastName: zod_1.z.string().min(1).max(100).optional(),
    role: zod_1.z.enum(['SUPERADMIN', 'ADMIN_DASHBOARD']).optional(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
const passwordResetSchema = zod_1.z.object({
    newPassword: zod_1.z.string().min(8),
});
/**
 * POST /admin/users/login
 * Public endpoint for admin login (no authentication required)
 */
router.post('/login', async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);
        const result = await adminUserService_1.adminUserService.login(data);
        // Set HttpOnly cookies for secure authentication
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000, // 1 hour
            path: '/',
        });
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 604800000, // 7 days
            path: '/',
        });
        // Return user data (but not tokens, they're in cookies)
        const { accessToken, refreshToken, ...userWithoutTokens } = result;
        res.status(200).json({
            success: true,
            data: userWithoutTokens,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        const message = error instanceof Error ? error.message : 'Login failed';
        res.status(400).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /admin/users
 * Create new admin user (SUPERADMIN only)
 */
router.post('/', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireSuperAdmin, async (req, res) => {
    try {
        const data = createAdminUserSchema.parse(req.body);
        // Validate password strength
        if (!(0, password_1.validatePasswordStrength)(data.password)) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must contain uppercase, lowercase, numbers, and symbols',
            });
        }
        const user = await adminUserService_1.adminUserService.create(data);
        res.status(201).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        const message = error instanceof Error ? error.message : 'Failed to create user';
        if (message.includes('already in use')) {
            return res.status(400).json({
                success: false,
                error: message,
            });
        }
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * GET /admin/users
 * List all admin users (authenticated admin)
 */
router.get('/', adminAuth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        const result = await adminUserService_1.adminUserService.listAll(limit, offset);
        res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to list users',
        });
    }
});
/**
 * GET /admin/users/:userId
 * Get admin user details
 */
router.get('/:userId', adminAuth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const user = await adminUserService_1.adminUserService.getById(req.params.userId);
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'User not found';
        if (message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: message,
            });
        }
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * PATCH /admin/users/:userId
 * Update admin user (SUPERADMIN only)
 */
router.patch('/:userId', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireSuperAdmin, async (req, res) => {
    try {
        const updates = updateAdminUserSchema.parse(req.body);
        const user = await adminUserService_1.adminUserService.update(req.params.userId, updates);
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        const message = error instanceof Error ? error.message : 'Failed to update user';
        if (message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: message,
            });
        }
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /admin/users/:userId/password-reset
 * Reset admin user password (SUPERADMIN only)
 */
router.post('/:userId/password-reset', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireSuperAdmin, async (req, res) => {
    try {
        const data = passwordResetSchema.parse(req.body);
        // Validate password strength
        if (!(0, password_1.validatePasswordStrength)(data.newPassword)) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must contain uppercase, lowercase, numbers, and symbols',
            });
        }
        const result = await adminUserService_1.adminUserService.resetPassword(req.params.userId, data.newPassword, req.adminUser.adminId);
        res.status(200).json({
            ...result,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        const message = error instanceof Error ? error.message : 'Failed to reset password';
        if (message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: message,
            });
        }
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /admin/users/:userId/deactivate
 * Deactivate admin user (SUPERADMIN only)
 */
router.post('/:userId/deactivate', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireSuperAdmin, async (req, res) => {
    try {
        const user = await adminUserService_1.adminUserService.deactivate(req.params.userId);
        res.status(200).json({
            success: true,
            data: user,
            message: 'User deactivated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to deactivate user';
        if (message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: message,
            });
        }
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /admin/users/:userId/reactivate
 * Reactivate admin user (SUPERADMIN only)
 */
router.post('/:userId/reactivate', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireSuperAdmin, async (req, res) => {
    try {
        const user = await adminUserService_1.adminUserService.reactivate(req.params.userId);
        res.status(200).json({
            success: true,
            data: user,
            message: 'User reactivated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reactivate user';
        if (message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: message,
            });
        }
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map