import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminUserService } from '../../services/adminUserService';
import { adminAuthMiddleware, requireSuperAdmin } from '../../middleware/adminAuth';
import { validatePasswordStrength } from '../../utils/password';

const router = Router();

/**
 * Validation Schemas
 */
const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['SUPERADMIN', 'ADMIN_DASHBOARD']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateAdminUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['SUPERADMIN', 'ADMIN_DASHBOARD']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const passwordResetSchema = z.object({
  newPassword: z.string().min(8),
});

/**
 * POST /admin/users/login
 * Public endpoint for admin login (no authentication required)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await adminUserService.login(data);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
router.post('/', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = createAdminUserSchema.parse(req.body);

    // Validate password strength
    if (!validatePasswordStrength(data.password)) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must contain uppercase, lowercase, numbers, and symbols',
      });
    }

    const user = await adminUserService.create(data);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
router.get('/', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await adminUserService.listAll(limit, offset);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
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
router.get('/:userId', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await adminUserService.getById(req.params.userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
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
router.patch('/:userId', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const updates = updateAdminUserSchema.parse(req.body);

    const user = await adminUserService.update(req.params.userId, updates);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
router.post('/:userId/password-reset', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = passwordResetSchema.parse(req.body);

    // Validate password strength
    if (!validatePasswordStrength(data.newPassword)) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must contain uppercase, lowercase, numbers, and symbols',
      });
    }

    const result = await adminUserService.resetPassword(
      req.params.userId,
      data.newPassword,
      req.adminUser!.adminId
    );

    res.status(200).json({
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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
router.post('/:userId/deactivate', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const user = await adminUserService.deactivate(req.params.userId);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User deactivated successfully',
    });
  } catch (error) {
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
router.post('/:userId/reactivate', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const user = await adminUserService.reactivate(req.params.userId);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User reactivated successfully',
    });
  } catch (error) {
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

export default router;
