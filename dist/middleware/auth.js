"use strict";
/**
 * Authentication Middleware
 * Extracts and verifies JWT tokens from Authorization header
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireOwner = exports.requireAdmin = void 0;
exports.authMiddleware = authMiddleware;
exports.authorizeRole = authorizeRole;
const jwt_1 = require("@utils/jwt");
/**
 * Middleware to verify JWT token and attach user info to request
 * Expected header: Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Missing or invalid authorization header',
                error: 'No token provided',
            });
            return;
        }
        // Extract token
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        // Verify token
        const payload = (0, jwt_1.verifyAccessToken)(token);
        // Attach user info to request
        req.user = payload;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: 'Authentication failed',
            error: error instanceof Error ? error.message : 'Invalid token',
        });
    }
}
/**
 * Middleware to check if user has specific role
 * @param allowedRoles - Array of allowed roles
 */
function authorizeRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'User not authenticated',
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                error: `User role '${req.user.role}' is not authorized for this action`,
            });
            return;
        }
        next();
    };
}
/**
 * Middleware to require admin role
 */
exports.requireAdmin = authorizeRole(['ADMIN', 'OWNER']);
/**
 * Middleware to require owner role
 */
exports.requireOwner = authorizeRole(['OWNER']);
/**
 * Middleware to require authentication (any logged-in user)
 */
exports.requireAuth = authMiddleware;
//# sourceMappingURL=auth.js.map