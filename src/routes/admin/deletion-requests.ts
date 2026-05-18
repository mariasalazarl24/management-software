import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import { adminAuthMiddleware, requireSuperAdmin, requireAdminAccess } from '../../middleware/adminAuth';

const router = Router();

/**
 * Validation Schemas
 */
const createDeletionRequestSchema = z.object({
  clientId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

const updateDeletionRequestSchema = z.object({
  approvalNotes: z.string().min(1).max(500).optional(),
});

/**
 * POST /admin/deletion-requests
 * Create a deletion request (SUPERADMIN only)
 */
router.post('/', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = createDeletionRequestSchema.parse(req.body);

    // Check if client exists
    const client = await prisma.b2BClient.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    // Check if there's already a pending/approved request
    const existingRequest = await prisma.clientDeletionRequest.findFirst({
      where: {
        clientId: data.clientId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'Active deletion request already exists for this client',
      });
    }

    // Create deletion request
    const deletionRequest = await prisma.clientDeletionRequest.create({
      data: {
        clientId: data.clientId,
        requestedById: req.adminUser!.adminId,
        reason: data.reason,
        status: 'PENDING',
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        client: {
          select: {
            companyName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: deletionRequest.id,
        clientId: deletionRequest.clientId,
        clientName: deletionRequest.client.companyName,
        requestedById: deletionRequest.requestedById,
        requestedByEmail: deletionRequest.requestedBy.email,
        status: deletionRequest.status,
        reason: deletionRequest.reason,
        createdAt: deletionRequest.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create deletion request',
    });
  }
});

/**
 * GET /admin/deletion-requests
 * List all deletion requests (authenticated admin)
 */
router.get('/', adminAuthMiddleware, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = (req.query.status as string) || 'PENDING';

    const requests = await prisma.clientDeletionRequest.findMany({
      where: {
        status: status as any,
      },
      take: limit,
      skip: offset,
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        client: {
          select: {
            companyName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.clientDeletionRequest.count({
      where: { status: status as any },
    });

    const formattedRequests = requests.map((req) => ({
      id: req.id,
      clientId: req.clientId,
      clientName: req.client.companyName,
      requestedById: req.requestedById,
      requestedByEmail: req.requestedBy.email,
      status: req.status,
      reason: req.reason,
      createdAt: req.createdAt,
      approvedAt: req.approvedAt,
      approvedBy: req.approvedBy,
      approvalNotes: req.approvalNotes,
    }));

    res.status(200).json({
      success: true,
      data: formattedRequests,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list deletion requests',
    });
  }
});

/**
 * GET /admin/deletion-requests/:requestId
 * Get specific deletion request
 */
router.get('/:requestId', adminAuthMiddleware, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const request = await prisma.clientDeletionRequest.findUnique({
      where: { id: req.params.requestId },
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
            status: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Deletion request not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: request.id,
        clientId: request.clientId,
        clientName: request.client.companyName,
        requestedById: request.requestedById,
        requestedByEmail: request.requestedBy.email,
        status: request.status,
        reason: request.reason,
        createdAt: request.createdAt,
        approvedAt: request.approvedAt,
        approvedBy: request.approvedBy,
        approvalNotes: request.approvalNotes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deletion request',
    });
  }
});

/**
 * POST /admin/deletion-requests/:requestId/approve
 * Approve a deletion request (SUPERADMIN only)
 */
router.post('/:requestId/approve', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = updateDeletionRequestSchema.parse(req.body);

    const request = await prisma.clientDeletionRequest.findUnique({
      where: { id: req.params.requestId },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Deletion request not found',
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Cannot approve request with status: ${request.status}`,
      });
    }

    // Update request status
    const updated = await prisma.clientDeletionRequest.update({
      where: { id: req.params.requestId },
      data: {
        status: 'APPROVED',
        approvedById: req.adminUser!.adminId,
        approvedAt: new Date(),
        approvalNotes: data.approvalNotes,
      },
      include: {
        client: {
          select: { companyName: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Deletion request approved',
      data: {
        id: updated.id,
        clientName: updated.client.companyName,
        status: updated.status,
        approvedAt: updated.approvedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to approve deletion request',
    });
  }
});

/**
 * POST /admin/deletion-requests/:requestId/reject
 * Reject a deletion request (SUPERADMIN only)
 */
router.post('/:requestId/reject', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const data = updateDeletionRequestSchema.parse(req.body);

    const request = await prisma.clientDeletionRequest.findUnique({
      where: { id: req.params.requestId },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Deletion request not found',
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Cannot reject request with status: ${request.status}`,
      });
    }

    // Update request status
    const updated = await prisma.clientDeletionRequest.update({
      where: { id: req.params.requestId },
      data: {
        status: 'REJECTED',
        approvedById: req.adminUser!.adminId,
        approvedAt: new Date(),
        approvalNotes: data.approvalNotes,
      },
      include: {
        client: {
          select: { companyName: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Deletion request rejected',
      data: {
        id: updated.id,
        clientName: updated.client.companyName,
        status: updated.status,
        rejectedAt: updated.approvedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to reject deletion request',
    });
  }
});

export default router;
