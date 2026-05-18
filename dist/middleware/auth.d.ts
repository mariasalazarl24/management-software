/**
 * Authentication Middleware
 * Extracts and verifies JWT tokens from Authorization header
 */
import { Request, Response, NextFunction } from 'express';
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
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to check if user has specific role
 * @param allowedRoles - Array of allowed roles
 */
export declare function authorizeRole(allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to require admin role
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to require owner role
 */
export declare const requireOwner: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to require authentication (any logged-in user)
 */
export declare const requireAuth: typeof authMiddleware;
//# sourceMappingURL=auth.d.ts.map