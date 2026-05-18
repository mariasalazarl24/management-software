"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvitationToken = generateInvitationToken;
exports.sendInvitation = sendInvitation;
exports.verifyInvitationToken = verifyInvitationToken;
exports.acceptInvitation = acceptInvitation;
exports.getBuildingInvitations = getBuildingInvitations;
exports.revokeInvitation = revokeInvitation;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
// 7 days in milliseconds
const INVITATION_EXPIRY_DAYS = 7;
/**
 * Generate a unique token for invitation
 */
function generateInvitationToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
/**
 * Send invitation to email for a specific building and role
 */
async function sendInvitation({ email, buildingId, role, invitedById, }) {
    try {
        // Check if building exists
        const building = await prisma.building.findUnique({
            where: { id: buildingId },
        });
        if (!building) {
            throw new Error('Building not found');
        }
        // Check if user already has an invitation for this building
        const existingInvitation = await prisma.invitation.findFirst({
            where: {
                email,
                buildingId,
                acceptedById: null, // Only check unaccepted invitations
            },
        });
        if (existingInvitation) {
            throw new Error('An active invitation already exists for this email');
        }
        // Check if user already exists and is already a member of the building
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            const existingMembership = await prisma.buildingMember.findFirst({
                where: {
                    buildingId,
                    userId: existingUser.id,
                },
            });
            if (existingMembership) {
                throw new Error('User is already a member of this building');
            }
        }
        // Generate unique token
        const token = generateInvitationToken();
        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
        // Create invitation
        const invitation = await prisma.invitation.create({
            data: {
                token,
                email: email.toLowerCase(),
                buildingId,
                invitedRole: role,
                invitedById,
                expiresAt,
            },
            include: {
                building: true,
                invitedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        return {
            success: true,
            invitation,
            invitationLink: `${process.env.FRONTEND_URL || 'http://localhost:5175'}/signup?token=${token}`,
        };
    }
    catch (error) {
        throw error;
    }
}
/**
 * Verify invitation token
 */
async function verifyInvitationToken(token) {
    try {
        const invitation = await prisma.invitation.findUnique({
            where: { token },
            include: {
                building: true,
                invitedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        if (!invitation) {
            throw new Error('Invalid invitation token');
        }
        // Check if already accepted
        if (invitation.acceptedById) {
            throw new Error('This invitation has already been accepted');
        }
        // Check if expired
        if (new Date() > invitation.expiresAt) {
            throw new Error('This invitation has expired');
        }
        return {
            valid: true,
            invitation: {
                email: invitation.email,
                buildingId: invitation.buildingId,
                buildingName: invitation.building.name,
                role: invitation.invitedRole,
                invitedBy: invitation.invitedBy,
            },
        };
    }
    catch (error) {
        throw error;
    }
}
/**
 * Accept invitation and create user account
 */
async function acceptInvitation(token, { firstName, lastName, password, phone }, hashedPassword) {
    try {
        const invitation = await prisma.invitation.findUnique({
            where: { token },
        });
        if (!invitation) {
            throw new Error('Invalid invitation token');
        }
        // Check if already accepted
        if (invitation.acceptedById) {
            throw new Error('This invitation has already been accepted');
        }
        // Check if expired
        if (new Date() > invitation.expiresAt) {
            throw new Error('This invitation has expired');
        }
        // Check if user already exists with this email
        let user = await prisma.user.findUnique({
            where: { email: invitation.email },
        });
        // Create user if doesn't exist
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: invitation.email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    phone: phone || null,
                    role: invitation.invitedRole === 'OWNER' ? 'OWNER' : 'ADMIN', // Map building role to user role
                    status: 'ACTIVE',
                },
            });
        }
        // Add user as building member
        await prisma.buildingMember.upsert({
            where: {
                buildingId_userId: {
                    buildingId: invitation.buildingId,
                    userId: user.id,
                },
            },
            update: {
                status: 'ACTIVE',
            },
            create: {
                buildingId: invitation.buildingId,
                userId: user.id,
                role: invitation.invitedRole,
                status: 'ACTIVE',
            },
        });
        // Mark invitation as accepted
        const acceptedInvitation = await prisma.invitation.update({
            where: { id: invitation.id },
            data: {
                acceptedById: user.id,
            },
        });
        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        };
    }
    catch (error) {
        throw error;
    }
}
/**
 * Get pending invitations for a building (admin only)
 */
async function getBuildingInvitations(buildingId) {
    try {
        const invitations = await prisma.invitation.findMany({
            where: {
                buildingId,
                acceptedById: null, // Only pending invitations
            },
            include: {
                invitedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return invitations.map((inv) => ({
            id: inv.id,
            email: inv.email,
            role: inv.invitedRole,
            invitedBy: inv.invitedBy,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
            isExpired: new Date() > inv.expiresAt,
        }));
    }
    catch (error) {
        throw error;
    }
}
/**
 * Revoke an invitation
 */
async function revokeInvitation(invitationId) {
    try {
        // Delete invitation if not yet accepted
        const invitation = await prisma.invitation.findUnique({
            where: { id: invitationId },
        });
        if (!invitation) {
            throw new Error('Invitation not found');
        }
        if (invitation.acceptedById) {
            throw new Error('Cannot revoke an already accepted invitation');
        }
        await prisma.invitation.delete({
            where: { id: invitationId },
        });
        return { success: true };
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=invitationService.js.map