import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { adminAuthMiddleware, requireAdminAccess } from '../../middleware/adminAuth';
import {
  DashboardSummary,
  ClientMetricsSummary,
  RevenueSummary,
  AlertItem,
} from '../../types/admin';

const router = Router();

/**
 * GET /admin/dashboard/summary
 * Get high-level overview of all clients and users
 */
router.get('/summary', adminAuthMiddleware, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    // Get client counts by status
    const [totalClients, activeClients, suspendedClients, cancelledClients] = await Promise.all([
      prisma.b2BClient.count(),
      prisma.b2BClient.count({ where: { status: 'ACTIVE' } }),
      prisma.b2BClient.count({ where: { status: 'SUSPENDED' } }),
      prisma.b2BClient.count({ where: { status: 'CANCELLED' } }),
    ]);

    // Get total users and buildings
    const [totalUsersResult, totalBuildingsResult] = await Promise.all([
      prisma.user.count(),
      prisma.building.count(),
    ]);

    // Get contracts expiring in 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const contractsExpiringResult = await prisma.b2BClient.count({
      where: {
        status: 'ACTIVE',
        contractEndDate: {
          lte: thirtyDaysFromNow,
          gt: new Date(),
        },
      },
    });

    const summary: DashboardSummary = {
      totalClients,
      activeClients,
      suspendedClients,
      cancelledClients,
      totalUsers: totalUsersResult,
      totalBuildings: totalBuildingsResult,
      contractsExpiringIn30Days: contractsExpiringResult,
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard summary',
    });
  }
});

/**
 * GET /admin/dashboard/clients-summary
 * Get all clients with usage metrics
 */
router.get('/clients-summary', adminAuthMiddleware, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const clients = await prisma.b2BClient.findMany({
      take: limit,
      skip: offset,
      select: {
        id: true,
        companyName: true,
        subdomain: true,
        accountType: true,
        status: true,
        userQuota: true,
        buildingQuota: true,
        contractEndDate: true,
        createdAt: true,
        _count: {
          select: {
            buildings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count users per client (simplified)
    const clientSummaries: ClientMetricsSummary[] = clients.map((client) => ({
      id: client.id,
      companyName: client.companyName,
      subdomain: client.subdomain,
      accountType: client.accountType,
      status: client.status,
      userQuota: client.userQuota,
      buildingQuota: client.buildingQuota || undefined,
      usersCount: 0, // TODO: Implement actual user count per client
      buildingsCount: client._count.buildings,
      contractEndDate: client.contractEndDate.toISOString(),
      createdAt: client.createdAt.toISOString(),
    }));

    const total = await prisma.b2BClient.count();

    res.status(200).json({
      success: true,
      data: clientSummaries,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients summary',
    });
  }
});

/**
 * GET /admin/dashboard/revenue-summary
 * Get contract and revenue overview
 */
router.get('/revenue-summary', adminAuthMiddleware, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get contract statuses
    const [totalActive, expiringIn30Days, expired] = await Promise.all([
      prisma.b2BClient.count({
        where: {
          status: 'ACTIVE',
          contractEndDate: { gt: now },
        },
      }),
      prisma.b2BClient.findMany({
        where: {
          status: 'ACTIVE',
          contractEndDate: {
            lte: thirtyDaysFromNow,
            gt: now,
          },
        },
        select: { companyName: true },
      }),
      prisma.b2BClient.findMany({
        where: {
          contractEndDate: { lte: now },
        },
        select: { companyName: true },
      }),
    ]);

    const summary: RevenueSummary = {
      totalActiveContracts: totalActive,
      totalContractValue: 0, // TODO: Implement when payment system is ready
      expiringContracts: {
        count: expiringIn30Days.length,
        clientNames: expiringIn30Days.map((c) => c.companyName),
      },
      expiredContracts: {
        count: expired.length,
        clientNames: expired.map((c) => c.companyName),
      },
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue summary',
    });
  }
});

/**
 * GET /admin/dashboard/alerts
 * Get active alerts and warnings
 */
router.get('/alerts', adminAuthMiddleware, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const alerts: AlertItem[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all active/suspended clients for alerts
    const clients = await prisma.b2BClient.findMany({
      where: {
        status: { in: ['ACTIVE', 'SUSPENDED'] },
      },
      select: {
        id: true,
        companyName: true,
        status: true,
        contractEndDate: true,
        _count: {
          select: { buildings: true },
        },
      },
    });

    for (const client of clients) {
      // Alert: Contracts expiring in 30 days
      if (client.status === 'ACTIVE' && client.contractEndDate <= thirtyDaysFromNow && client.contractEndDate > now) {
        const daysRemaining = Math.ceil((client.contractEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          type: 'EXPIRING_CONTRACT',
          severity: daysRemaining <= 7 ? 'CRITICAL' : 'WARNING',
          clientId: client.id,
          clientName: client.companyName,
          message: `Contract expires in ${daysRemaining} days`,
          data: { daysRemaining },
          timestamp: now,
        });
      }

      // Alert: Expired contracts
      if (client.contractEndDate <= now) {
        alerts.push({
          type: 'EXPIRED_CONTRACT',
          severity: 'CRITICAL',
          clientId: client.id,
          clientName: client.companyName,
          message: 'Contract has expired',
          data: { expiredDate: client.contractEndDate },
          timestamp: now,
        });
      }

      // Alert: Suspended clients
      if (client.status === 'SUSPENDED') {
        alerts.push({
          type: 'SUSPENDED_CLIENT',
          severity: 'WARNING',
          clientId: client.id,
          clientName: client.companyName,
          message: 'Client account is suspended',
          timestamp: now,
        });
      }
    }

    // Sort by severity and timestamp
    const severityMap = { CRITICAL: 3, WARNING: 2, INFO: 1 };
    alerts.sort((a, b) => {
      const severityDiff = severityMap[b.severity] - severityMap[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    res.status(200).json({
      success: true,
      data: alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
        warning: alerts.filter((a) => a.severity === 'WARNING').length,
        info: alerts.filter((a) => a.severity === 'INFO').length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});

export default router;
