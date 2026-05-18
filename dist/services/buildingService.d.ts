/**
 * Building Service
 * Handles building operations, member management, and data retrieval
 */
/**
 * Get all buildings where user is a member/owner
 * @param userId - User ID
 * @param limit - Pagination limit
 * @param offset - Pagination offset
 */
export declare function getUserBuildings(userId: string, limit?: number, offset?: number): Promise<{
    id: string;
    name: string;
    address: string;
    city: string;
    postalCode: string | null;
    userRole: import(".prisma/client").$Enums.BuildingRole;
    apartmentCount: number;
    memberCount: number;
    createdAt: Date;
}[]>;
/**
 * Get single building details
 * @param buildingId - Building ID
 * @param userId - User ID (for permission check)
 */
export declare function getBuildingDetails(buildingId: string, userId: string): Promise<{
    userRole: import(".prisma/client").$Enums.BuildingRole;
    stats: {
        members: number;
        apartments: number;
    };
    _count: {
        members: number;
        apartments: number;
    };
    id: string;
    status: import(".prisma/client").$Enums.BuildingStatus;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    clientId: string;
    address: string;
    city: string;
    postalCode: string | null;
    country: string;
    totalApartments: number;
    yearBuilt: number | null;
    description: string | null;
}>;
/**
 * Get building members
 * @param buildingId - Building ID
 * @param userId - User ID (for permission check)
 */
export declare function getBuildingMembers(buildingId: string, userId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: import(".prisma/client").$Enums.BuildingRole;
    joinedAt: Date;
}[]>;
/**
 * Check if user is admin of a building
 * @param buildingId - Building ID
 * @param userId - User ID
 */
export declare function isBuildingAdmin(buildingId: string, userId: string): Promise<boolean>;
/**
 * Get dashboard metrics for admin
 * @param userId - User ID
 */
export declare function getDashboardMetrics(userId: string): Promise<{
    buildingCount: number;
    apartmentCount: number;
    memberCount: number;
    recentActivity: {
        id: string;
        title: string;
        status: import(".prisma/client").$Enums.MaintenanceStatus;
        apartmentNumber: string;
        buildingName: string;
        createdAt: Date;
    }[];
}>;
//# sourceMappingURL=buildingService.d.ts.map