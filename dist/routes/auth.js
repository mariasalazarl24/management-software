"use strict";
/**
 * Authentication Routes
 * Handles user login, registration, token refresh, and logout
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authService = __importStar(require("../services/authService"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * Validation schemas
 */
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
/**
 * POST /auth/register
 * DEPRECATED: Use /invitations/accept instead
 * Registration is now invitation-based only
 */
// router.post('/register', async (req: Request, res: Response): Promise<void> => {
//   try {
//     // Validate request body
//     const data = registerSchema.parse(req.body);
//     // Register user
//     const result = await authService.registerUser(data);
//     res.status(201).json({
//       success: true,
//       message: 'User registered successfully',
//       data: result,
//     });
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({
//         success: false,
//         message: 'Validation error',
//         error: error.errors[0].message,
//       });
//       return;
//     }
//     res.status(400).json({
//       success: false,
//       message: 'Registration failed',
//       error: error instanceof Error ? error.message : 'Unknown error',
//     });
//   }
// });
/**
 * POST /auth/login
 * Login user with email and password
 */
router.post('/login', async (req, res) => {
    try {
        // Validate request body
        const data = loginSchema.parse(req.body);
        // Login user
        const result = await authService.loginUser(data);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.errors[0].message,
            });
            return;
        }
        res.status(401).json({
            success: false,
            message: 'Login failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /auth/refresh
 * Generate new access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        // Validate request body
        const data = refreshSchema.parse(req.body);
        // Refresh token
        const result = await authService.refreshAccessToken(data.refreshToken);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: result,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.errors[0].message,
            });
            return;
        }
        res.status(401).json({
            success: false,
            message: 'Token refresh failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /auth/me
 * Get current authenticated user info
 */
router.get('/me', auth_1.authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
            return;
        }
        // Get user details
        const user = await authService.getUserById(req.user.userId);
        res.status(200).json({
            success: true,
            message: 'User info retrieved',
            data: user,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to get user info',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /auth/logout
 * Logout user (frontend handles token removal)
 */
router.post('/logout', auth_1.authMiddleware, async (_req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Logout failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map