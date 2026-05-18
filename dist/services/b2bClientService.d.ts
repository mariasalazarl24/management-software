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
export declare const createClient: (data: CreateClientInput) => Promise<{
    id: string;
    companyName: string;
    subdomain: string;
    accountType: import(".prisma/client").$Enums.AccountType;
    status: import(".prisma/client").$Enums.ClientStatus;
    userQuota: number;
    buildingQuota: number | null;
    paymentPlan: string;
    paymentAccessRole: string;
    contractStartDate: Date;
    contractEndDate: Date;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Get client by subdomain
 * @param subdomain The subdomain to lookup
 * @returns B2BClient or null
 */
export declare const getClientBySubdomain: (subdomain: string) => Promise<{
    id: string;
    companyName: string;
    subdomain: string;
    accountType: import(".prisma/client").$Enums.AccountType;
    status: import(".prisma/client").$Enums.ClientStatus;
    userQuota: number;
    buildingQuota: number | null;
    paymentPlan: string;
    paymentAccessRole: string;
    contractStartDate: Date;
    contractEndDate: Date;
    createdAt: Date;
    updatedAt: Date;
} | null>;
/**
 * Get client by ID
 * @param clientId The client ID
 * @returns B2BClient or null
 */
export declare const getClientById: (clientId: string) => Promise<{
    id: string;
    companyName: string;
    subdomain: string;
    accountType: import(".prisma/client").$Enums.AccountType;
    status: import(".prisma/client").$Enums.ClientStatus;
    userQuota: number;
    buildingQuota: number | null;
    paymentPlan: string;
    paymentAccessRole: string;
    contractStartDate: Date;
    contractEndDate: Date;
    createdAt: Date;
    updatedAt: Date;
} | null>;
/**
 * List all B2B clients (SuperAdmin only)
 * @param limit Max results
 * @param offset Pagination offset
 * @returns List of clients with basic info
 */
export declare const listClients: (limit?: number, offset?: number) => Promise<{
    id: string;
    companyName: string;
    subdomain: string;
    accountType: import(".prisma/client").$Enums.AccountType;
    status: import(".prisma/client").$Enums.ClientStatus;
    userQuota: number;
    buildingQuota: number | null;
    paymentPlan: string;
    contractStartDate: Date;
    contractEndDate: Date;
    createdAt: Date;
    _count: {
        buildings: number;
    };
}[]>;
/**
 * Get detailed metrics for a client
 * @param clientId The client ID
 * @returns ClientMetrics with usage info
 */
export declare const getClientMetrics: (clientId: string) => Promise<ClientMetrics>;
/**
 * Check if client has available user quota
 * @param clientId The client ID
 * @returns QuotaCheckResult
 */
export declare const checkUserQuota: (clientId: string) => Promise<QuotaCheckResult>;
/**
 * Check if client has available building quota (AdComplex only)
 * @param clientId The client ID
 * @returns QuotaCheckResult
 */
export declare const checkBuildingQuota: (clientId: string) => Promise<QuotaCheckResult>;
/**
 * Update client details
 * @param clientId The client ID
 * @param updates Partial client data
 * @returns Updated B2BClient
 */
export declare const updateClient: (clientId: string, updates: {
    companyName?: string;
    userQuota?: number;
    buildingQuota?: number;
    paymentPlan?: string;
    status?: "ACTIVE" | "SUSPENDED" | "CANCELLED";
}) => Promise<{
    id: string;
    companyName: string;
    subdomain: string;
    accountType: import(".prisma/client").$Enums.AccountType;
    status: import(".prisma/client").$Enums.ClientStatus;
    userQuota: number;
    buildingQuota: number | null;
    paymentPlan: string;
    paymentAccessRole: string;
    contractStartDate: Date;
    contractEndDate: Date;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Suspend a client (disable access)
 * @param clientId The client ID
 * @param reason Reason for suspension
 */
export declare const suspendClient: (clientId: string, reason: string) => Promise<{
    id: string;
    companyName: string;
    subdomain: string;
    accountType: import(".prisma/client").$Enums.AccountType;
    status: import(".prisma/client").$Enums.ClientStatus;
    userQuota: number;
    buildingQuota: number | null;
    paymentPlan: string;
    paymentAccessRole: string;
    contractStartDate: Date;
    contractEndDate: Date;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Reactivate a suspended client
 * @param clientId The client ID
 */
export declare const reactivateClient: (clientId: string) => Promise<{
    id: string;
    companyName: string;
    subdomain: string;
    accountType: import(".prisma/client").$Enums.AccountType;
    status: import(".prisma/client").$Enums.ClientStatus;
    userQuota: number;
    buildingQuota: number | null;
    paymentPlan: string;
    paymentAccessRole: string;
    contractStartDate: Date;
    contractEndDate: Date;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Get contract details for a client
 * @param clientId The client ID
 * @returns Contract info
 */
export declare const getClientContract: (clientId: string) => Promise<{
    clientId: string;
    paymentPlan: string;
    contractStartDate: Date;
    contractEndDate: Date;
    isActive: boolean;
    daysRemaining: number;
    requiresRenewal: boolean;
}>;
/**
 * Validate that a client is still active and under contract
 * @param clientId The client ID
 * @throws Error if client is not valid
 */
export declare const validateClientActive: (clientId: string) => Promise<void>;
//# sourceMappingURL=b2bClientService.d.ts.map