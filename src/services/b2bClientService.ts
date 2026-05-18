import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Types
export interface CreateClientInput {
  companyName: string;
  subdomain: string;
  accountType: 'BUILDING' | 'ADCOMPLEX';
  userQuota: number;
  buildingQuota?: number;
  paymentPlan: string;
  contractStartDate: Date;
  contractEndDate: Date;
}

export interface ClientMetrics {
  clientId: string;
  companyName: string;
  accountType: string;
  userCount: number;
  userQuota: number;
  userUsagePercent: number;
  buildingCount: number;
  buildingQuota?: number;
  buildingUsagePercent?: number;
  status: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  usage: number;
}

/**
 * Create a new B2B client account
 * @param data Client creation data
 * @returns Created B2BClient
 */
export const createClient = async (data: CreateClientInput) => {
  // Validate subdomain format (alphanumeric and hyphens only)
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
  if (!subdomainRegex.test(data.subdomain)) {
    throw new Error('Invalid subdomain format. Use alphanumeric and hyphens only.');
  }

  // Check if subdomain already exists
  const existingClient = await prisma.b2BClient.findUnique({
    where: { subdomain: data.subdomain.toLowerCase() }
  });

  if (existingClient) {
    throw new Error(`Subdomain '${data.subdomain}' is already taken`);
  }

  // Check if company name already exists
  const existingCompany = await prisma.b2BClient.findUnique({
    where: { companyName: data.companyName }
  });

  if (existingCompany) {
    throw new Error(`Company name '${data.companyName}' is already registered`);
  }

  // For BUILDING type, buildingQuota should be null or 1
  if (data.accountType === 'BUILDING' && data.buildingQuota && data.buildingQuota > 1) {
    throw new Error('BUILDING type accounts can only have 1 building');
  }

  // Create the client
  const paymentAccessRole = data.accountType === 'BUILDING' ? 'BUILDING_ADMIN' : 'COMPLEX_MANAGER';

  const client = await prisma.b2BClient.create({
    data: {
      companyName: data.companyName,
      subdomain: data.subdomain.toLowerCase(),
      accountType: data.accountType,
      status: 'ACTIVE',
      userQuota: data.userQuota,
      buildingQuota: data.accountType === 'BUILDING' ? null : (data.buildingQuota || 10),
      paymentPlan: data.paymentPlan,
      paymentAccessRole: paymentAccessRole,
      contractStartDate: data.contractStartDate,
      contractEndDate: data.contractEndDate
    }
  });

  return client;
};

/**
 * Get client by subdomain
 * @param subdomain The subdomain to lookup
 * @returns B2BClient or null
 */
export const getClientBySubdomain = async (subdomain: string) => {
  const client = await prisma.b2BClient.findUnique({
    where: { subdomain: subdomain.toLowerCase() }
  });

  if (!client) {
    return null;
  }

  // Don't return suspended or cancelled clients
  if (client.status !== 'ACTIVE') {
    throw new Error(`Client is ${client.status.toLowerCase()}`);
  }

  return client;
};

/**
 * Get client by ID
 * @param clientId The client ID
 * @returns B2BClient or null
 */
export const getClientById = async (clientId: string) => {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId }
  });

  return client;
};

/**
 * List all B2B clients (SuperAdmin only)
 * @param limit Max results
 * @param offset Pagination offset
 * @returns List of clients with basic info
 */
export const listClients = async (limit: number = 50, offset: number = 0) => {
  const clients = await prisma.b2BClient.findMany({
    skip: offset,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      companyName: true,
      subdomain: true,
      accountType: true,
      status: true,
      userQuota: true,
      buildingQuota: true,
      paymentPlan: true,
      contractStartDate: true,
      contractEndDate: true,
      createdAt: true,
      _count: {
        select: {
          buildings: true
        }
      }
    }
  });

  return clients;
};

/**
 * Get detailed metrics for a client
 * @param clientId The client ID
 * @returns ClientMetrics with usage info
 */
export const getClientMetrics = async (clientId: string): Promise<ClientMetrics> => {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId },
    include: {
      buildings: {
        select: {
          id: true,
          members: true
        }
      }
    }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  // Count unique users across all buildings
  const userIds = new Set<string>();
  client.buildings.forEach(building => {
    building.members.forEach(member => {
      userIds.add(member.userId);
    });
  });
  const userCount = userIds.size;

  const userUsagePercent = Math.round((userCount / client.userQuota) * 100);
  const buildingCount = client.buildings.length;
  const buildingUsagePercent = client.buildingQuota
    ? Math.round((buildingCount / client.buildingQuota) * 100)
    : 0;

  return {
    clientId: client.id,
    companyName: client.companyName,
    accountType: client.accountType,
    userCount,
    userQuota: client.userQuota,
    userUsagePercent,
    buildingCount,
    buildingQuota: client.buildingQuota || undefined,
    buildingUsagePercent,
    status: client.status
  };
};

/**
 * Check if client has available user quota
 * @param clientId The client ID
 * @returns QuotaCheckResult
 */
export const checkUserQuota = async (clientId: string): Promise<QuotaCheckResult> => {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId },
    include: {
      buildings: {
        select: {
          members: {
            select: { userId: true }
          }
        }
      }
    }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  // Count unique users
  const userIds = new Set<string>();
  client.buildings.forEach(building => {
    building.members.forEach(member => {
      userIds.add(member.userId);
    });
  });
  const currentUsers = userIds.size;

  return {
    allowed: currentUsers < client.userQuota,
    current: currentUsers,
    limit: client.userQuota,
    usage: Math.round((currentUsers / client.userQuota) * 100)
  };
};

/**
 * Check if client has available building quota (AdComplex only)
 * @param clientId The client ID
 * @returns QuotaCheckResult
 */
export const checkBuildingQuota = async (clientId: string): Promise<QuotaCheckResult> => {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId },
    include: {
      buildings: {
        select: { id: true }
      }
    }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (!client.buildingQuota) {
    throw new Error('BUILDING type accounts do not have building quotas');
  }

  const currentBuildings = client.buildings.length;

  return {
    allowed: currentBuildings < client.buildingQuota,
    current: currentBuildings,
    limit: client.buildingQuota,
    usage: Math.round((currentBuildings / client.buildingQuota) * 100)
  };
};

/**
 * Update client details
 * @param clientId The client ID
 * @param updates Partial client data
 * @returns Updated B2BClient
 */
export const updateClient = async (
  clientId: string,
  updates: {
    companyName?: string;
    userQuota?: number;
    buildingQuota?: number;
    paymentPlan?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  }
) => {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  // Validate company name uniqueness if changing
  if (updates.companyName && updates.companyName !== client.companyName) {
    const existingCompany = await prisma.b2BClient.findUnique({
      where: { companyName: updates.companyName }
    });
    if (existingCompany) {
      throw new Error('Company name is already taken');
    }
  }

  // Validate quotas
  if (updates.userQuota !== undefined && updates.userQuota < 1) {
    throw new Error('User quota must be at least 1');
  }

  if (client.accountType === 'BUILDING' && updates.buildingQuota && updates.buildingQuota > 1) {
    throw new Error('BUILDING type accounts can only have 1 building');
  }

  const updated = await prisma.b2BClient.update({
    where: { id: clientId },
    data: {
      companyName: updates.companyName,
      userQuota: updates.userQuota,
      buildingQuota: updates.buildingQuota,
      paymentPlan: updates.paymentPlan,
      status: updates.status
    }
  });

  return updated;
};

/**
 * Suspend a client (disable access)
 * @param clientId The client ID
 * @param reason Reason for suspension
 */
export const suspendClient = async (clientId: string, reason: string) => {
  const client = await prisma.b2BClient.update({
    where: { id: clientId },
    data: { status: 'SUSPENDED' }
  });

  // TODO: Log suspension reason to audit log
  return client;
};

/**
 * Reactivate a suspended client
 * @param clientId The client ID
 */
export const reactivateClient = async (clientId: string) => {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (client.status !== 'SUSPENDED') {
    throw new Error('Client is not suspended');
  }

  const updated = await prisma.b2BClient.update({
    where: { id: clientId },
    data: { status: 'ACTIVE' }
  });

  return updated;
};

/**
 * Get contract details for a client
 * @param clientId The client ID
 * @returns Contract info
 */
export const getClientContract = async (clientId: string) => {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  const today = new Date();
  const isActive = client.status === 'ACTIVE' && today < client.contractEndDate;
  const daysRemaining = Math.ceil(
    (client.contractEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    clientId: client.id,
    paymentPlan: client.paymentPlan,
    contractStartDate: client.contractStartDate,
    contractEndDate: client.contractEndDate,
    isActive,
    daysRemaining: isActive ? daysRemaining : 0,
    requiresRenewal: daysRemaining <= 30 && isActive
  };
};

/**
 * Validate that a client is still active and under contract
 * @param clientId The client ID
 * @throws Error if client is not valid
 */
export const validateClientActive = async (clientId: string) => {
  const client = await prisma.b2BClient.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (client.status !== 'ACTIVE') {
    throw new Error(`Client is ${client.status.toLowerCase()}`);
  }

  const today = new Date();
  if (today > client.contractEndDate) {
    throw new Error('Client contract has expired');
  }
};
