"use strict";
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
const auth_1 = require("@middleware/auth");
const buildingAuth_1 = require("@middleware/buildingAuth");
const invitationService = __importStar(require("@services/invitationService"));
const passwordUtils = __importStar(require("@utils/password"));
const router = (0, express_1.Router)();
// Validation schemas
const sendInvitationSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    buildingId: zod_1.z.string().uuid('Invalid building ID'),
    role: zod_1.z.enum(['ADMIN', 'OWNER', 'BOARD_MEMBER']),
});
const verifyTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
});
const acceptInvitationSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    firstName: zod_1.z.string().min(2, 'First name must be at least 2 characters'),
    lastName: zod_1.z.string().min(2, 'Last name must be at least 2 characters'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    phone: zod_1.z.string().optional(),
});
/**
 * POST /invitations/send
 * Send invitation to email (building admin only)
 */
router.post('/send', auth_1.authMiddleware, buildingAuth_1.buildingAdminOnly, async (req, res) => {
    try {
        const { email, buildingId, role } = sendInvitationSchema.parse(req.body);
        const result = await invitationService.sendInvitation({
            email,
            buildingId,
            role,
            invitedById: req.user.id,
        });
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors,
            });
        }
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to send invitation',
        });
    }
});
/**
 * GET /invitations/verify/:token
 * Verify invitation token (public endpoint)
 */
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = verifyTokenSchema.parse({ token: req.params.token });
        const result = await invitationService.verifyInvitationToken(token);
        res.status(200).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors,
            });
        }
        res.status(400).json({
            success: false,
            valid: false,
            error: error.message || 'Invalid token',
        });
    }
});
/**
 * POST /invitations/accept
 * Accept invitation and create user account (public endpoint)
 */
router.post('/accept', async (req, res) => {
    try {
        const { token, firstName, lastName, password, phone } = acceptInvitationSchema.parse(req.body);
        // Validate password strength
        passwordUtils.validatePasswordStrength(password);
        // Hash password
        const hashedPassword = await passwordUtils.hashPassword(password);
        const result = await invitationService.acceptInvitation(token, { firstName, lastName, password, phone }, hashedPassword);
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors,
            });
        }
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to accept invitation',
        });
    }
});
/**
 * GET /invitations/building/:buildingId
 * Get pending invitations for building (building admin only)
 */
router.get('/building/:buildingId', auth_1.authMiddleware, buildingAuth_1.buildingAdminOnly, async (req, res) => {
    try {
        const { buildingId } = req.params;
        const invitations = await invitationService.getBuildingInvitations(buildingId);
        res.status(200).json({
            success: true,
            invitations,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch invitations',
        });
    }
});
/**
 * DELETE /invitations/:invitationId
 * Revoke an invitation (building admin only)
 */
router.delete('/:invitationId', auth_1.authMiddleware, buildingAuth_1.buildingAdminOnly, async (req, res) => {
    try {
        const { invitationId } = req.params;
        const result = await invitationService.revokeInvitation(invitationId);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to revoke invitation',
        });
    }
});
exports.default = router;
//# sourceMappingURL=invitations.js.map