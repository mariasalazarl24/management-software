/**
 * Authentication Middleware
 * Extracts and verifies JWT tokens from Authorization header
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@utils/jwt';
import { JWTPayload } from '@types/auth';

/**
 * Extend Express Request to include authenticated user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to verify JWT token and attach user info to request
 * Expected header: Authorization: Bearer <token>
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
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
    const payload = verifyAccessToken(token);

    // Attach user info to request
    req.user = payload;

    next();
  } catch (error) {
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
export function authorizeRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
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
export const requireAdmin = authorizeRole(['ADMIN', 'OWNER']);

/**
 * Middleware to require owner role
 */
export const requireOwner = authorizeRole(['OWNER']);

/**
 * Middleware to require authentication (any logged-in user)
 */
export const requireAuth = authMiddleware;
