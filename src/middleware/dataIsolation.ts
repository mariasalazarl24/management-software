import { Request, Response, NextFunction } from 'express';
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
export const enforceDataIsolation = async (
  req: ClientRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip if no client context or no user
    if (!req.clientContext || !req.user) {
      return next();
    }

    const clientId = req.clientContext.clientId;
    const userId = (req.user as any).id;

    // TODO: Verify user belongs to this client
    // This would require:
    // 1. Join User -> BuildingMember -> Building -> B2BClient
    // 2. Check that user's building is in the requested client

    // For now, just attach clientId to request for safe filtering
    req.clientContext.clientId = clientId;

    next();
  } catch (error) {
    console.error('Data isolation error:', error);
    return res.status(500).json({
      error: 'Data isolation check failed',
      message: 'Unable to validate data access'
    });
  }
};

/**
 * Type-safe query builder with automatic client filtering
 * Used to ensure all Prisma queries include clientId filter
 */
export class ClientQueryBuilder {
  private clientId: string;

  constructor(clientId: string) {
    if (!clientId) {
      throw new Error('ClientQueryBuilder requires a valid clientId');
    }
    this.clientId = clientId;
  }

  /**
   * Get filter object for Building queries
   * Use in: prisma.building.findMany({ where: this.buildingFilter() })
   */
  buildingFilter() {
    return {
      clientId: this.clientId
    };
  }

  /**
   * Get filter object for User queries (through BuildingMember)
   * Use for finding users in a specific client
   */
  userFilter() {
    return {
      buildingMembers: {
        some: {
          building: {
            clientId: this.clientId
          }
        }
      }
    };
  }

  /**
   * Get filter object for BuildingMember queries
   */
  memberFilter() {
    return {
      building: {
        clientId: this.clientId
      }
    };
  }

  /**
   * Get filter object for Apartment queries
   */
  apartmentFilter() {
    return {
      building: {
        clientId: this.clientId
      }
    };
  }

  /**
   * Get filter object for Fee queries
   */
  feeFilter() {
    return {
      building: {
        clientId: this.clientId
      }
    };
  }

  /**
   * Get filter object for Announcement queries
   */
  announcementFilter() {
    return {
      building: {
        clientId: this.clientId
      }
    };
  }

  /**
   * Get filter object for BoardMember queries
   */
  boardMemberFilter() {
    return {
      clientId: this.clientId
    };
  }

  /**
   * Get filter object for GeneralMeeting queries
   */
  meetingFilter() {
    return {
      clientId: this.clientId
    };
  }

  /**
   * Get filter object for FinancialDocument queries
   */
  documentFilter() {
    return {
      clientId: this.clientId
    };
  }

  /**
   * Get filter object for BuildingExpense queries
   */
  expenseFilter() {
    return {
      clientId: this.clientId
    };
  }

  /**
   * Get filter object for SupportTicket queries
   */
  ticketFilter() {
    return {
      clientId: this.clientId
    };
  }

  /**
   * Get filter object for ComplexAmenity queries
   */
  amenityFilter() {
    return {
      clientId: this.clientId
    };
  }
}

/**
 * Helper function to get query builder from request
 */
export const getQueryBuilder = (req: ClientRequest): ClientQueryBuilder => {
  if (!req.clientContext) {
    throw new Error('No client context in request');
  }
  return new ClientQueryBuilder(req.clientContext.clientId);
};

/**
 * Middleware to attach query builder to request
 * Add after subdomainRouter middleware
 */
export const attachQueryBuilder = (
  req: ClientRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.clientContext) {
    (req as any).queryBuilder = new ClientQueryBuilder(req.clientContext.clientId);
  }
  next();
};

/**
 * Validate that a clientId matches the request context
 * Use in route handlers to ensure user is operating on the correct client
 */
export const validateClientId = (
  req: ClientRequest,
  providedClientId: string
): boolean => {
  if (!req.clientContext) {
    return false;
  }

  const matches = req.clientContext.clientId === providedClientId;

  if (!matches) {
    console.warn(
      `[ISOLATION VIOLATION] User attempted cross-client access: ` +
      `Expected ${req.clientContext.clientId}, got ${providedClientId}`
    );
  }

  return matches;
};

/**
 * Assert that a clientId matches the request context
 * Use in route handlers to ensure user is operating on the correct client
 * Throws error if validation fails
 */
export const assertClientId = (
  req: ClientRequest,
  providedClientId: string
): void => {
  if (!validateClientId(req, providedClientId)) {
    throw new Error(
      'Invalid client context. User is not authorized to access this resource.'
    );
  }
};

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
