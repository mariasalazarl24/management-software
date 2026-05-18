"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateClientActive = exports.getClientContract = exports.reactivateClient = exports.suspendClient = exports.updateClient = exports.checkBuildingQuota = exports.checkUserQuota = exports.getClientMetrics = exports.listClients = exports.getClientById = exports.getClientBySubdomain = exports.createClient = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Create a new B2B client account
 * @param data Client creation data
 * @returns Created B2BClient
 */
const createClient = async (data) => {
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
exports.createClient = createClient;
/**
 * Get client by subdomain
 * @param subdomain The subdomain to lookup
 * @returns B2BClient or null
 */
const getClientBySubdomain = async (subdomain) => {
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
exports.getClientBySubdomain = getClientBySubdomain;
/**
 * Get client by ID
 * @param clientId The client ID
 * @returns B2BClient or null
 */
const getClientById = async (clientId) => {
    const client = await prisma.b2BClient.findUnique({
        where: { id: clientId }
    });
    return client;
};
exports.getClientById = getClientById;
/**
 * List all B2B clients (SuperAdmin only)
 * @param limit Max results
 * @param offset Pagination offset
 * @returns List of clients with basic info
 */
const listClients = async (limit = 50, offset = 0) => {
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
exports.listClients = listClients;
/**
 * Get detailed metrics for a client
 * @param clientId The client ID
 * @returns ClientMetrics with usage info
 */
const getClientMetrics = async (clientId) => {
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
    const userIds = new Set();
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
exports.getClientMetrics = getClientMetrics;
/**
 * Check if client has available user quota
 * @param clientId The client ID
 * @returns QuotaCheckResult
 */
const checkUserQuota = async (clientId) => {
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
    const userIds = new Set();
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
exports.checkUserQuota = checkUserQuota;
/**
 * Check if client has available building quota (AdComplex only)
 * @param clientId The client ID
 * @returns QuotaCheckResult
 */
const checkBuildingQuota = async (clientId) => {
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
exports.checkBuildingQuota = checkBuildingQuota;
/**
 * Update client details
 * @param clientId The client ID
 * @param updates Partial client data
 * @returns Updated B2BClient
 */
const updateClient = async (clientId, updates) => {
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
exports.updateClient = updateClient;
/**
 * Suspend a client (disable access)
 * @param clientId The client ID
 * @param reason Reason for suspension
 */
const suspendClient = async (clientId, reason) => {
    const client = await prisma.b2BClient.update({
        where: { id: clientId },
        data: { status: 'SUSPENDED' }
    });
    // TODO: Log suspension reason to audit log
    return client;
};
exports.suspendClient = suspendClient;
/**
 * Reactivate a suspended client
 * @param clientId The client ID
 */
const reactivateClient = async (clientId) => {
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
exports.reactivateClient = reactivateClient;
/**
 * Get contract details for a client
 * @param clientId The client ID
 * @returns Contract info
 */
const getClientContract = async (clientId) => {
    const client = await prisma.b2BClient.findUnique({
        where: { id: clientId }
    });
    if (!client) {
        throw new Error('Client not found');
    }
    const today = new Date();
    const isActive = client.status === 'ACTIVE' && today < client.contractEndDate;
    const daysRemaining = Math.ceil((client.contractEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
exports.getClientContract = getClientContract;
/**
 * Validate that a client is still active and under contract
 * @param clientId The client ID
 * @throws Error if client is not valid
 */
const validateClientActive = async (clientId) => {
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
exports.validateClientActive = validateClientActive;
//# sourceMappingURL=b2bClientService.js.map