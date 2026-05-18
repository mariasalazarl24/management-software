import { Router, Response } from 'express';
import { z } from 'zod';
import { ClientRequest } from '../../middleware/subdomainRouter';
import {
  createClient,
  listClients,
  getClientMetrics,
  updateClient,
  suspendClient,
  reactivateClient,
  getClientContract
} from '../../services/b2bClientService';

const router = Router();

// Validation schemas
const createClientSchema = z.object({
  companyName: z.string().min(2).max(255),
  subdomain: z.string().min(3).max(63).regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i),
  accountType: z.enum(['BUILDING', 'ADCOMPLEX']),
  userQuota: z.number().int().min(1).max(10000),
  buildingQuota: z.number().int().min(1).max(1000).optional(),
  paymentPlan: z.string().min(1).max(100),
  contractStartDate: z.coerce.date(),
  contractEndDate: z.coerce.date()
});

const updateClientSchema = z.object({
  companyName: z.string().min(2).max(255).optional(),
  userQuota: z.number().int().min(1).max(10000).optional(),
  buildingQuota: z.number().int().min(1).max(1000).optional(),
  paymentPlan: z.string().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']).optional()
});

// Middleware to require SuperAdmin role
const requireSuperAdmin = (req: ClientRequest, res: Response, next: Function) => {
  // TODO: Check if user is SuperAdmin
  // For now, assume authenticated
  next();
};

/**
 * POST /admin/clients
 * Create a new B2B client
 * SuperAdmin only
 */
router.post('/', requireSuperAdmin, async (req: ClientRequest, res: Response) => {
  try {
    const validData = createClientSchema.parse(req.body);

    // Validate contract dates
    if (validData.contractStartDate >= validData.contractEndDate) {
      return res.status(400).json({
        error: 'Invalid contract dates',
        message: 'Contract start date must be before end date'
      });
    }

    // Validate buildingQuota for ADCOMPLEX
    if (validData.accountType === 'ADCOMPLEX' && !validData.buildingQuota) {
      return res.status(400).json({
        error: 'Missing buildingQuota',
        message: 'AdComplex accounts must specify a building quota'
      });
    }

    const client = await createClient(validData);

    return res.status(201).json({
      success: true,
      data: {
        id: client.id,
        companyName: client.companyName,
        subdomain: client.subdomain,
        accountType: client.accountType,
        userQuota: client.userQuota,
        buildingQuota: client.buildingQuota,
        status: client.status,
        createdAt: client.createdAt
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        error: 'Client creation failed',
        message: error.message
      });
    }

    console.error('Create client error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /admin/clients
 * List all B2B clients
 * SuperAdmin & Admin Dashboard users
 */
router.get('/', requireSuperAdmin, async (req: ClientRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const clients = await listClients(limit, offset);

    return res.json({
      success: true,
      data: clients,
      pagination: {
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('List clients error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /admin/clients/:clientId
 * Get client metrics
 * SuperAdmin & Admin Dashboard users
 */
router.get('/:clientId/metrics', requireSuperAdmin, async (req: ClientRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    const metrics = await getClientMetrics(clientId);

    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Client not found') {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    console.error('Get metrics error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /admin/clients/:clientId/contract
 * Get contract details
 * SuperAdmin & Admin Dashboard users
 */
router.get('/:clientId/contract', requireSuperAdmin, async (req: ClientRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    const contract = await getClientContract(clientId);

    return res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Client not found') {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    console.error('Get contract error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /admin/clients/:clientId
 * Update client details
 * SuperAdmin only
 */
router.patch('/:clientId', requireSuperAdmin, async (req: ClientRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const validData = updateClientSchema.parse(req.body);

    const updated = await updateClient(clientId, validData);

    return res.json({
      success: true,
      data: {
        id: updated.id,
        companyName: updated.companyName,
        subdomain: updated.subdomain,
        accountType: updated.accountType,
        userQuota: updated.userQuota,
        buildingQuota: updated.buildingQuota,
        status: updated.status,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    if (error instanceof Error && error.message === 'Client not found') {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        error: 'Update failed',
        message: error.message
      });
    }

    console.error('Update client error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /admin/clients/:clientId/suspend
 * Suspend a client
 * SuperAdmin only
 */
router.post('/:clientId/suspend', requireSuperAdmin, async (req: ClientRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Suspension reason is required'
      });
    }

    const updated = await suspendClient(clientId, reason);

    return res.json({
      success: true,
      message: 'Client suspended',
      data: {
        id: updated.id,
        status: updated.status
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Client not found') {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    console.error('Suspend client error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /admin/clients/:clientId/reactivate
 * Reactivate a suspended client
 * SuperAdmin only
 */
router.post('/:clientId/reactivate', requireSuperAdmin, async (req: ClientRequest, res: Response) => {
  try {
    const { clientId } = req.params;

    const updated = await reactivateClient(clientId);

    return res.json({
      success: true,
      message: 'Client reactivated',
      data: {
        id: updated.id,
        status: updated.status
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Client not found') {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        error: 'Reactivation failed',
        message: error.message
      });
    }

    console.error('Reactivate client error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;
