import { Request, Response, NextFunction } from 'express';
import { AdminJWTPayload } from '../types/admin';
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
export declare function generateAdminAccessToken(payload: Omit<AdminJWTPayload, 'iat' | 'exp'>): string;
/**
 * Generate admin refresh token
 */
export declare function generateAdminRefreshToken(payload: Omit<AdminJWTPayload, 'iat' | 'exp'>): string;
/**
 * Generate admin token pair
 */
export declare function generateAdminTokenPair(payload: Omit<AdminJWTPayload, 'iat' | 'exp'>): {
    accessToken: string;
    refreshToken: string;
};
/**
 * Verify admin JWT token
 */
export declare function verifyAdminToken(token: string): AdminJWTPayload;
/**
 * Admin authentication middleware
 * Extracts and verifies JWT token from Authorization header
 */
export declare function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Require SUPERADMIN role
 */
export declare function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void;
/**
 * Require admin access (SUPERADMIN or ADMIN_DASHBOARD)
 */
export declare function requireAdminAccess(req: Request, res: Response, next: NextFunction): void;
/**
 * Optional admin authentication
 * Does not fail if no token provided
 */
export declare function optionalAdminAuth(req: Request, _res: Response, next: NextFunction): void;
/**
 * Decode admin token without verification (for debugging only)
 */
export declare function decodeAdminToken(token: string): AdminJWTPayload | null;
//# sourceMappingURL=adminAuth.d.ts.map