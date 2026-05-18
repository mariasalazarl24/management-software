"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAdminAccessToken = generateAdminAccessToken;
exports.generateAdminRefreshToken = generateAdminRefreshToken;
exports.generateAdminTokenPair = generateAdminTokenPair;
exports.verifyAdminToken = verifyAdminToken;
exports.adminAuthMiddleware = adminAuthMiddleware;
exports.requireSuperAdmin = requireSuperAdmin;
exports.requireAdminAccess = requireAdminAccess;
exports.optionalAdminAuth = optionalAdminAuth;
exports.decodeAdminToken = decodeAdminToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'admin-secret-key';
/**
 * Generate admin JWT token
 */
function generateAdminAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, ADMIN_TOKEN_SECRET, {
        expiresIn: '1h',
    });
}
/**
 * Generate admin refresh token
 */
function generateAdminRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, ADMIN_TOKEN_SECRET, {
        expiresIn: '7d',
    });
}
/**
 * Generate admin token pair
 */
function generateAdminTokenPair(payload) {
    return {
        accessToken: generateAdminAccessToken(payload),
        refreshToken: generateAdminRefreshToken(payload),
    };
}
/**
 * Verify admin JWT token
 */
function verifyAdminToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, ADMIN_TOKEN_SECRET);
    }
    catch (error) {
        throw new Error('Invalid or expired admin token');
    }
}
/**
 * Admin authentication middleware
 * Extracts and verifies JWT token from Authorization header
 */
function adminAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Missing authorization header',
                message: 'Please provide a valid JWT token',
            });
            return;
        }
        const token = authHeader.substring(7); // Remove "Bearer "
        try {
            const payload = verifyAdminToken(token);
            req.adminUser = payload;
            next();
        }
        catch (error) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                message: error instanceof Error ? error.message : 'Authentication failed',
            });
        }
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: error instanceof Error ? error.message : 'Unexpected error',
        });
    }
}
/**
 * Require SUPERADMIN role
 */
function requireSuperAdmin(req, res, next) {
    if (!req.adminUser) {
        res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Admin authentication required',
        });
        return;
    }
    if (req.adminUser.role !== 'SUPERADMIN') {
        res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: `User role '${req.adminUser.role}' is not authorized for this action`,
        });
        return;
    }
    next();
}
/**
 * Require admin access (SUPERADMIN or ADMIN_DASHBOARD)
 */
function requireAdminAccess(req, res, next) {
    if (!req.adminUser) {
        res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Admin authentication required',
        });
        return;
    }
    const allowedRoles = ['SUPERADMIN', 'ADMIN_DASHBOARD'];
    if (!allowedRoles.includes(req.adminUser.role)) {
        res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: `User role '${req.adminUser.role}' is not authorized for this action`,
        });
        return;
    }
    next();
}
/**
 * Optional admin authentication
 * Does not fail if no token provided
 */
function optionalAdminAuth(req, _res, next) {
    try {
        const authHeader = req.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const payload = verifyAdminToken(token);
                req.adminUser = payload;
            }
            catch (error) {
                // Ignore token verification errors, just continue without admin user
            }
        }
        next();
    }
    catch (error) {
        // Ignore errors, continue without admin user
        next();
    }
}
/**
 * Decode admin token without verification (for debugging only)
 */
function decodeAdminToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch (error) {
        return null;
    }
}
//# sourceMappingURL=adminAuth.js.map