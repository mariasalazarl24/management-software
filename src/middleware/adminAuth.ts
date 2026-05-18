import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminJWTPayload, AdminRole } from '../types/admin';

const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'admin-secret-key';

/**
 * Extend Express Request to include admin user
 */
declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminJWTPayload;
    }
  }
}

/**
 * Generate admin JWT token
 */
export function generateAdminAccessToken(payload: Omit<AdminJWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ADMIN_TOKEN_SECRET, {
    expiresIn: '1h',
  });
}

/**
 * Generate admin refresh token
 */
export function generateAdminRefreshToken(payload: Omit<AdminJWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ADMIN_TOKEN_SECRET, {
    expiresIn: '7d',
  });
}

/**
 * Generate admin token pair
 */
export function generateAdminTokenPair(payload: Omit<AdminJWTPayload, 'iat' | 'exp'>) {
  return {
    accessToken: generateAdminAccessToken(payload),
    refreshToken: generateAdminRefreshToken(payload),
  };
}

/**
 * Verify admin JWT token
 */
export function verifyAdminToken(token: string): AdminJWTPayload {
  try {
    return jwt.verify(token, ADMIN_TOKEN_SECRET) as AdminJWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired admin token');
  }
}

/**
 * Admin authentication middleware
 * Extracts and verifies JWT token from Authorization header
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
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
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  } catch (error) {
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
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
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
export function requireAdminAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.adminUser) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Admin authentication required',
    });
    return;
  }

  const allowedRoles: AdminRole[] = ['SUPERADMIN', 'ADMIN_DASHBOARD'];
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
export function optionalAdminAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.get('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = verifyAdminToken(token);
        req.adminUser = payload;
      } catch (error) {
        // Ignore token verification errors, just continue without admin user
      }
    }

    next();
  } catch (error) {
    // Ignore errors, continue without admin user
    next();
  }
}

/**
 * Decode admin token without verification (for debugging only)
 */
export function decodeAdminToken(token: string): AdminJWTPayload | null {
  try {
    return jwt.decode(token) as AdminJWTPayload;
  } catch (error) {
    return null;
  }
}
