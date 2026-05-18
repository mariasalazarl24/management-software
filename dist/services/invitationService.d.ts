interface SendInvitationParams {
    email: string;
    buildingId: string;
    role: 'ADMIN' | 'OWNER' | 'BOARD_MEMBER';
    invitedById: string;
}
interface AcceptInvitationParams {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
    phone?: string;
}
/**
 * Generate a unique token for invitation
 */
export declare function generateInvitationToken(): string;
/**
 * Send invitation to email for a specific building and role
 */
export declare function sendInvitation({ email, buildingId, role, invitedById, }: SendInvitationParams): Promise<{
    success: boolean;
    invitation: {
        building: {
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
        };
        invitedBy: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        buildingId: string;
        email: string;
        invitedById: string;
        token: string;
        invitedRole: import(".prisma/client").$Enums.BuildingRole;
        acceptedById: string | null;
        expiresAt: Date;
    };
    invitationLink: string;
}>;
/**
 * Verify invitation token
 */
export declare function verifyInvitationToken(token: string): Promise<{
    valid: boolean;
    invitation: {
        email: string;
        buildingId: string;
        buildingName: string;
        role: import(".prisma/client").$Enums.BuildingRole;
        invitedBy: {
            email: string;
            firstName: string;
            lastName: string;
        };
    };
}>;
/**
 * Accept invitation and create user account
 */
export declare function acceptInvitation(token: string, { firstName, lastName, password, phone }: AcceptInvitationParams, hashedPassword: string): Promise<{
    success: boolean;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
}>;
/**
 * Get pending invitations for a building (admin only)
 */
export declare function getBuildingInvitations(buildingId: string): Promise<{
    id: string;
    email: string;
    role: import(".prisma/client").$Enums.BuildingRole;
    invitedBy: {
        email: string;
        firstName: string;
        lastName: string;
    };
    expiresAt: Date;
    createdAt: Date;
    isExpired: boolean;
}[]>;
/**
 * Revoke an invitation
 */
export declare function revokeInvitation(invitationId: string): Promise<{
    success: boolean;
}>;
export {};
//# sourceMappingURL=invitationService.d.ts.map