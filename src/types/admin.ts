/**
 * Admin user types for Phase 2
 * Separate from regular user authentication
 */

export type AdminRole = 'SUPERADMIN' | 'ADMIN_DASHBOARD';

export interface AdminJWTPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  iat?: number;
  exp?: number;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    admin: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: AdminRole;
    };
  };
  error?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAdminUserRequest {
  firstName?: string;
  lastName?: string;
  role?: AdminRole;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface PasswordResetRequest {
  adminId: string;
  userEmail: string;
  newPassword: string;
}

export interface DeletionRequest {
  id: string;
  clientId: string;
  clientName: string;
  requestedById: string;
  requestedByEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  reason: string;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  approvalNotes?: string;
}

export interface DashboardSummary {
  totalClients: number;
  activeClients: number;
  suspendedClients: number;
  cancelledClients: number;
  totalUsers: number;
  totalBuildings: number;
  contractsExpiringIn30Days: number;
}

export interface ClientMetricsSummary {
  id: string;
  companyName: string;
  subdomain: string;
  accountType: string;
  status: string;
  userQuota: number;
  buildingQuota?: number;
  usersCount: number;
  buildingsCount: number;
  contractEndDate: string;
  createdAt: string;
}

export interface RevenueSummary {
  totalActiveContracts: number;
  totalContractValue: number;
  expiringContracts: {
    count: number;
    clientNames: string[];
  };
  expiredContracts: {
    count: number;
    clientNames: string[];
  };
}

export interface AlertItem {
  type: 'QUOTA_WARNING' | 'EXPIRING_CONTRACT' | 'SUSPENDED_CLIENT' | 'EXPIRED_CONTRACT';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  clientId: string;
  clientName: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
}
