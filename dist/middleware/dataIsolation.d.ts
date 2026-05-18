import { Response, NextFunction } from 'express';
import { ClientRequest } from './subdomainRouter';
/**
 * Data Isolation Middleware
 *
 * Enforces strict data isolation:
 * 1. Ensures user belongs to the requested client
 * 2. Validates clientId on all operations
 * 3. Prevents cross-client data access
 * 4. Logs isolation violations
 *
 * Should be applied AFTER authentication and client context middleware
 */
export declare const enforceDataIsolation: (req: ClientRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Type-safe query builder with automatic client filtering
 * Used to ensure all Prisma queries include clientId filter
 */
export declare class ClientQueryBuilder {
    private clientId;
    constructor(clientId: string);
    /**
     * Get filter object for Building queries
     * Use in: prisma.building.findMany({ where: this.buildingFilter() })
     */
    buildingFilter(): {
        clientId: string;
    };
    /**
     * Get filter object for User queries (through BuildingMember)
     * Use for finding users in a specific client
     */
    userFilter(): {
        buildingMembers: {
            some: {
                building: {
                    clientId: string;
                };
            };
        };
    };
    /**
     * Get filter object for BuildingMember queries
     */
    memberFilter(): {
        building: {
            clientId: string;
        };
    };
    /**
     * Get filter object for Apartment queries
     */
    apartmentFilter(): {
        building: {
            clientId: string;
        };
    };
    /**
     * Get filter object for Fee queries
     */
    feeFilter(): {
        building: {
            clientId: string;
        };
    };
    /**
     * Get filter object for Announcement queries
     */
    announcementFilter(): {
        building: {
            clientId: string;
        };
    };
    /**
     * Get filter object for BoardMember queries
     */
    boardMemberFilter(): {
        clientId: string;
    };
    /**
     * Get filter object for GeneralMeeting queries
     */
    meetingFilter(): {
        clientId: string;
    };
    /**
     * Get filter object for FinancialDocument queries
     */
    documentFilter(): {
        clientId: string;
    };
    /**
     * Get filter object for BuildingExpense queries
     */
    expenseFilter(): {
        clientId: string;
    };
    /**
     * Get filter object for SupportTicket queries
     */
    ticketFilter(): {
        clientId: string;
    };
    /**
     * Get filter object for ComplexAmenity queries
     */
    amenityFilter(): {
        clientId: string;
    };
}
/**
 * Helper function to get query builder from request
 */
export declare const getQueryBuilder: (req: ClientRequest) => ClientQueryBuilder;
/**
 * Middleware to attach query builder to request
 * Add after subdomainRouter middleware
 */
export declare const attachQueryBuilder: (req: ClientRequest, res: Response, next: NextFunction) => void;
/**
 * Validate that a clientId matches the request context
 * Use in route handlers to ensure user is operating on the correct client
 */
export declare const validateClientId: (req: ClientRequest, providedClientId: string) => boolean;
/**
 * Assert that a clientId matches the request context
 * Use in route handlers to ensure user is operating on the correct client
 * Throws error if validation fails
 */
export declare const assertClientId: (req: ClientRequest, providedClientId: string) => void;
/**
 * Best practices for using these utilities:
 *
 * ✅ CORRECT - Using query builder:
 * ```typescript
 * const qb = getQueryBuilder(req);
 * const buildings = await prisma.building.findMany({
 *   where: qb.buildingFilter()
 * });
 * ```
 *
 * ✅ CORRECT - Using validateClientId:
 * ```typescript
 * const buildingId = req.params.buildingId;
 * const building = await prisma.building.findUnique({
 *   where: { id: buildingId }
 * });
 * if (!building || !validateClientId(req, building.clientId)) {
 *   throw new NotFoundError();
 * }
 * ```
 *
 * ❌ WRONG - No client filtering:
 * ```typescript
 * const buildings = await prisma.building.findMany();
 * ```
 *
 * ❌ WRONG - Incorrect filter syntax:
 * ```typescript
 * const qb = getQueryBuilder(req);
 * const buildings = await prisma.building.findMany({
 *   where: { clientId: req.clientContext.clientId }  // Wrong - circular
 * });
 * ```
 */
//# sourceMappingURL=dataIsolation.d.ts.map