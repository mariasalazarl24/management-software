"use strict";
/**
 * Building Authorization Middleware
 * Validates user's access to specific buildings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildingAuthMiddleware = buildingAuthMiddleware;
exports.buildingAdminOnly = buildingAdminOnly;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Middleware to check if user has access to a building
 * Expects buildingId in URL parameters
 */
async function buildingAuthMiddleware(req, res, next) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const { buildingId } = req.params;
        if (!buildingId) {
            res.status(400).json({
                success: false,
                message: 'Building ID is required',
                error: 'Missing buildingId parameter',
            });
            return;
        }
        // Check if user is a member of this building
        const membership = await prisma.buildingMember.findFirst({
            where: {
                userId: req.user.userId,
                buildingId: buildingId,
            },
        });
        if (!membership) {
            res.status(403).json({
                success: false,
                message: 'Access denied',
                error: 'You are not a member of this building',
            });
            return;
        }
        // Attach building membership info to request
        req.buildingRole = membership.role;
        req.buildingId = buildingId;
        next();
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Authorization check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
/**
 * Middleware to check if user is admin of the building
 * Must be used after buildingAuthMiddleware
 */
function buildingAdminOnly(req, res, next) {
    if (!req.buildingRole || (req.buildingRole !== 'ADMIN' && req.buildingRole !== 'OWNER')) {
        res.status(403).json({
            success: false,
            message: 'Admin access required',
            error: 'Only building admins can perform this action',
        });
        return;
    }
    next();
}
//# sourceMappingURL=buildingAuth.js.map