import { Request, Response, NextFunction } from 'express';
/**
 * Extended Express Request with client context
 */
export interface ClientRequest extends Request {
    clientContext?: {
        clientId: string;
        subdomain: string;
        companyName: string;
        accountType: string;
        userQuota: number;
        buildingQuota: number | null;
    };
}
/**
 * Subdomain Router Middleware
 *
 * Extracts the subdomain from the request host and resolves the B2BClient.
 * Injects clientContext into the request for use in routes and services.
 *
 * Domain format: {subdomain}.buildhub.casa
 * Examples:
 *   - residencias-palmira.buildhub.casa → subdomain: "residencias-palmira"
 *   - admin.buildhub.casa → subdomain: "admin" (reserved for SuperAdmin)
 *   - localhost:3001 → no subdomain (development)
 */
export declare const subdomainRouter: (req: ClientRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware to ensure a valid client context exists
 * Use this on routes that require a client
 */
export declare const requireClientContext: (req: ClientRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Extract client ID from request context or query
 * Useful for type-safe queries
 */
export declare const getClientIdFromRequest: (req: ClientRequest) => string;
/**
 * Development helper: Set client context from header
 * Usage: Add header "X-Client-Id: {clientId}" to requests
 * Useful for testing APIs without subdomains
 */
export declare const devClientContext: (req: ClientRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Log client context info
 * Use for debugging and monitoring
 */
export declare const logClientContext: (req: ClientRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=subdomainRouter.d.ts.map