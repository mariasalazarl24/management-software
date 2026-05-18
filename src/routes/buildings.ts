/**
 * Building Routes
 * Handles building management and dashboard endpoints
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, requireAdmin } from '@middleware/auth';
import { buildingAuthMiddleware, buildingAdminOnly } from '@middleware/buildingAuth';
import * as buildingService from '@services/buildingService';

const router = Router();

/**
 * GET /buildings
 * Get all buildings where user is a member
 * Requires: Authentication
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const buildings = await buildingService.getUserBuildings(req.user.userId, limit, offset);

    res.status(200).json({
      success: true,
      message: 'Buildings retrieved successfully',
      data: buildings,
      pagination: {
        limit,
        offset,
        count: buildings.length,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to retrieve buildings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /buildings/:buildingId
 * Get single building details
 * Requires: Authentication + Building membership
 */
router.get(
  '/:buildingId',
  authMiddleware,
  buildingAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.params.buildingId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const building = await buildingService.getBuildingDetails(
        req.params.buildingId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'Building details retrieved',
        data: building,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('Access denied') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to retrieve building details',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /buildings/:buildingId/members
 * Get building members
 * Requires: Authentication + Building membership
 */
router.get(
  '/:buildingId/members',
  authMiddleware,
  buildingAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.params.buildingId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const members = await buildingService.getBuildingMembers(
        req.params.buildingId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'Building members retrieved',
        data: members,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('Access denied') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to retrieve building members',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

router.get(
  '/dashboard',
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const metrics = await buildingService.getDashboardMetrics(req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Dashboard metrics retrieved',
        data: metrics,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to retrieve dashboard metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
