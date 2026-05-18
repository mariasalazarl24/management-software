"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../../db");
const adminAuth_1 = require("../../middleware/adminAuth");
const router = (0, express_1.Router)();
/**
 * GET /admin/audit/password-resets
 * View password reset history
 */
router.get('/password-resets', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireAdminAccess, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        // Get password reset logs
        const logs = await db_1.prisma.passwordResetLog.findMany({
            take: limit,
            skip: offset,
            include: {
                resetBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const total = await db_1.prisma.passwordResetLog.count();
        // Format response
        const formattedLogs = logs.map((log) => ({
            id: log.id,
            userEmail: log.userEmail,
            userRole: log.userRole,
            user: log.user,
            resetByEmail: log.resetBy?.email,
            resetBy: log.resetBy,
            resetByRole: log.resetByRole,
            createdAt: log.createdAt,
        }));
        res.status(200).json({
            success: true,
            data: formattedLogs,
            pagination: {
                limit,
                offset,
                total,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch password reset logs',
        });
    }
});
/**
 * GET /admin/audit/password-resets/:resetId
 * Get specific password reset log
 */
router.get('/password-resets/:resetId', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireAdminAccess, async (req, res) => {
    try {
        const log = await db_1.prisma.passwordResetLog.findUnique({
            where: { id: req.params.resetId },
            include: {
                resetBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!log) {
            return res.status(404).json({
                success: false,
                error: 'Password reset log not found',
            });
        }
        res.status(200).json({
            success: true,
            data: {
                id: log.id,
                userEmail: log.userEmail,
                userRole: log.userRole,
                user: log.user,
                resetByEmail: log.resetBy?.email,
                resetBy: log.resetBy,
                resetByRole: log.resetByRole,
                createdAt: log.createdAt,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch password reset log',
        });
    }
});
/**
 * GET /admin/audit/logs
 * View general activity logs (stub for future implementation)
 */
router.get('/logs', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireAdminAccess, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        // Get audit logs (if AuditLog model exists)
        try {
            const logs = await db_1.prisma.auditLog.findMany({
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    action: true,
                    entityType: true,
                    entityId: true,
                    userId: true,
                    buildingId: true,
                    ipAddress: true,
                    changes: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            const total = await db_1.prisma.auditLog.count();
            res.status(200).json({
                success: true,
                data: logs,
                pagination: {
                    limit,
                    offset,
                    total,
                },
            });
        }
        catch (error) {
            // AuditLog model may not exist yet
            res.status(200).json({
                success: true,
                message: 'Audit logging not yet implemented',
                data: [],
                pagination: {
                    limit,
                    offset,
                    total: 0,
                },
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs',
        });
    }
});
/**
 * GET /admin/audit/logs/:logId
 * Get specific audit log
 */
router.get('/logs/:logId', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireAdminAccess, async (req, res) => {
    try {
        try {
            const log = await db_1.prisma.auditLog.findUnique({
                where: { id: req.params.logId },
            });
            if (!log) {
                return res.status(404).json({
                    success: false,
                    error: 'Audit log not found',
                });
            }
            res.status(200).json({
                success: true,
                data: log,
            });
        }
        catch (error) {
            // AuditLog model may not exist
            res.status(404).json({
                success: false,
                error: 'Audit log not found',
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit log',
        });
    }
});
/**
 * GET /admin/audit/admin-actions
 * View admin user actions (login, client changes, etc.)
 */
router.get('/admin-actions', adminAuth_1.adminAuthMiddleware, adminAuth_1.requireAdminAccess, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        // Combine multiple logs: password resets, deletion requests, etc.
        const [passwordResets, deletionRequests] = await Promise.all([
            db_1.prisma.passwordResetLog.findMany({
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    resetByRole: true,
                    userEmail: true,
                    createdAt: true,
                    resetBy: {
                        select: { email: true, firstName: true, lastName: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            db_1.prisma.clientDeletionRequest.findMany({
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    status: true,
                    reason: true,
                    createdAt: true,
                    approvedAt: true,
                    client: { select: { companyName: true } },
                    requestedBy: { select: { email: true, firstName: true, lastName: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        // Combine and format
        const actions = [
            ...passwordResets.map((log) => ({
                type: 'PASSWORD_RESET',
                description: `Password reset for ${log.userEmail}`,
                performedBy: log.resetBy?.firstName + ' ' + log.resetBy?.lastName,
                timestamp: log.createdAt,
            })),
            ...deletionRequests.map((req) => ({
                type: 'DELETION_REQUEST',
                status: req.status,
                description: `Deletion request for ${req.client.companyName}`,
                reason: req.reason,
                performedBy: req.requestedBy?.firstName + ' ' + req.requestedBy?.lastName,
                timestamp: req.createdAt,
            })),
        ];
        // Sort by timestamp
        actions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        res.status(200).json({
            success: true,
            data: actions,
            pagination: {
                limit,
                offset,
                total: actions.length,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch admin actions',
        });
    }
});
exports.default = router;
//# sourceMappingURL=audit.js.map