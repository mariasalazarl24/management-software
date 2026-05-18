/**
 * Building Authorization Middleware
 * Validates user's access to specific buildings
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to check if user has access to a building
 * Expects buildingId in URL parameters
 */
export declare function buildingAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware to check if user is admin of the building
 * Must be used after buildingAuthMiddleware
 */
export declare function buildingAdminOnly(req: Request, res: Response, next: NextFunction): void;
/**
 * Extend Express Request to include building info
 */
declare global {
    namespace Express {
        interface Request {
            buildingId?: string;
            buildingRole?: string;
        }
    }
}
//# sourceMappingURL=buildingAuth.d.ts.map