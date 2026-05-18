import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '@middleware/auth';
import { buildingAdminOnly } from '@middleware/buildingAuth';
import * as invitationService from '@services/invitationService';
import * as passwordUtils from '@utils/password';

const router = Router();

// Validation schemas
const sendInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  buildingId: z.string().uuid('Invalid building ID'),
  role: z.enum(['ADMIN', 'OWNER', 'BOARD_MEMBER']),
});

const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string().optional(),
});

/**
 * POST /invitations/send
 * Send invitation to email (building admin only)
 */
router.post(
  '/send',
  authMiddleware,
  buildingAdminOnly,
  async (req, res) => {
    try {
      const { email, buildingId, role } = sendInvitationSchema.parse(req.body);

      const result = await invitationService.sendInvitation({
        email,
        buildingId,
        role,
        invitedById: (req as any).user.id,
      });

      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
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
  }
);

/**
 * GET /invitations/verify/:token
 * Verify invitation token (public endpoint)
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = verifyTokenSchema.parse({ token: req.params.token });

    const result = await invitationService.verifyInvitationToken(token);

    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
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
    const { token, firstName, lastName, password, phone } =
      acceptInvitationSchema.parse(req.body);

    // Validate password strength
    passwordUtils.validatePasswordStrength(password);

    // Hash password
    const hashedPassword = await passwordUtils.hashPassword(password);

    const result = await invitationService.acceptInvitation(
      token,
      { firstName, lastName, password, phone },
      hashedPassword
    );

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
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
router.get(
  '/building/:buildingId',
  authMiddleware,
  buildingAdminOnly,
  async (req, res) => {
    try {
      const { buildingId } = req.params;

      const invitations = await invitationService.getBuildingInvitations(
        buildingId
      );

      res.status(200).json({
        success: true,
        invitations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch invitations',
      });
    }
  }
);

/**
 * DELETE /invitations/:invitationId
 * Revoke an invitation (building admin only)
 */
router.delete(
  '/:invitationId',
  authMiddleware,
  buildingAdminOnly,
  async (req, res) => {
    try {
      const { invitationId } = req.params;

      const result = await invitationService.revokeInvitation(invitationId);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to revoke invitation',
      });
    }
  }
);

export default router;
