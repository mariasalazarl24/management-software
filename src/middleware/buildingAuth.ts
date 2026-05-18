/**
 * Building Authorization Middleware
 * Validates user's access to specific buildings
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to check if user has access to a building
 * Expects buildingId in URL parameters
 */
export async function buildingAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { buildingId } = req.params;

    if (!buildingId) {
      res.status(400).json({
        success: false,
        message: 'Building ID is required',
        error: 'Missing buildingId parameter',
      });
      return;
    }

    // Check if user is a member of this building
    const membership = await prisma.buildingMember.findUnique({
      where: {
        userId_buildingId: {
          userId: req.user.userId,
          buildingId: buildingId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'You are not a member of this building',
      });
      return;
    }

    // Attach building membership info to request
    req.buildingRole = membership.role;
    req.buildingId = buildingId;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Middleware to check if user is admin of the building
 * Must be used after buildingAuthMiddleware
 */
export function buildingAdminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.buildingRole || (req.buildingRole !== 'ADMIN' && req.buildingRole !== 'OWNER')) {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'Only building admins can perform this action',
    });
    return;
  }

  next();
}

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
