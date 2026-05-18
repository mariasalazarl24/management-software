/**
 * Authentication Routes
 * Handles user login, registration, token refresh, and logout
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '@services/authService';
import { authMiddleware } from '@middleware/auth';

const router = Router();

/**
 * Validation schemas
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
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
router.post('/login', async (req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    if (error instanceof z.ZodError) {
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
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    if (error instanceof z.ZodError) {
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
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
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
router.post('/logout', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Logout failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
