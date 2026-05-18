import { CreateAdminUserRequest, AdminLoginRequest, UpdateAdminUserRequest } from '../types/admin';
export declare const adminUserService: {
    /**
     * Create a new admin user
     */
    create(data: CreateAdminUserRequest): Promise<any>;
    /**
     * Authenticate admin user and return tokens
     */
    login(data: AdminLoginRequest): Promise<{
        admin: any;
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Get admin user by ID
     */
    getById(adminId: string): Promise<any>;
    /**
     * List all admin users
     */
    listAll(limit?: number, offset?: number): Promise<{
        data: {
            id: string;
            status: import(".prisma/client").$Enums.AdminStatus;
            createdAt: Date;
            updatedAt: Date;
            role: import(".prisma/client").$Enums.AdminRole;
            email: string;
            firstName: string;
            lastName: string;
        }[];
        pagination: {
            limit: number;
            offset: number;
            total: number;
        };
    }>;
    /**
     * Update admin user
     */
    update(adminId: string, updates: UpdateAdminUserRequest): Promise<any>;
    /**
     * Reset admin user password (by another admin)
     * Logs the action to PasswordResetLog
     */
    resetPassword(userId: string, newPassword: string, resetByAdminId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Deactivate admin user
     */
    deactivate(adminId: string): Promise<any>;
    /**
     * Reactivate admin user
     */
    reactivate(adminId: string): Promise<any>;
    /**
     * Remove password from user object for safe return
     */
    sanitizeUser(user: any): any;
};
export declare function sanitizeAdminUser(user: any): any;
//# sourceMappingURL=adminUserService.d.ts.map