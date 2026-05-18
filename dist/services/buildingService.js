"use strict";
/**
 * Building Service
 * Handles building operations, member management, and data retrieval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBuildings = getUserBuildings;
exports.getBuildingDetails = getBuildingDetails;
exports.getBuildingMembers = getBuildingMembers;
exports.isBuildingAdmin = isBuildingAdmin;
exports.getDashboardMetrics = getDashboardMetrics;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Get all buildings where user is a member/owner
 * @param userId - User ID
 * @param limit - Pagination limit
 * @param offset - Pagination offset
 */
async function getUserBuildings(userId, limit = 10, offset = 0) {
    // Get buildings through BuildingMember relationship
    const buildings = await prisma.building.findMany({
        where: {
            members: {
                some: {
                    userId: userId,
                },
            },
        },
        include: {
            members: {
                where: { userId: userId },
                select: { role: true },
            },
            _count: {
                select: {
                    apartments: true,
                    members: true,
                },
            },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
    });
    return buildings.map((building) => ({
        id: building.id,
        name: building.name,
        address: building.address,
        city: building.city,
        postalCode: building.postalCode,
        userRole: building.members[0]?.role,
        apartmentCount: building._count.apartments,
        memberCount: building._count.members,
        createdAt: building.createdAt,
    }));
}
/**
 * Get single building details
 * @param buildingId - Building ID
 * @param userId - User ID (for permission check)
 */
async function getBuildingDetails(buildingId, userId) {
    // Check if user is member of this building
    const userMembership = await prisma.buildingMember.findFirst({
        where: {
            userId,
            buildingId,
        },
    });
    if (!userMembership) {
        throw new Error('Access denied: User is not a member of this building');
    }
    const building = await prisma.building.findUnique({
        where: { id: buildingId },
        include: {
            _count: {
                select: {
                    apartments: true,
                    members: true,
                },
            },
        },
    });
    if (!building) {
        throw new Error('Building not found');
    }
    return {
        ...building,
        userRole: userMembership.role,
        stats: building._count,
    };
}
/**
 * Get building members
 * @param buildingId - Building ID
 * @param userId - User ID (for permission check)
 */
async function getBuildingMembers(buildingId, userId) {
    // Verify user is member
    const userMembership = await prisma.buildingMember.findFirst({
        where: {
            userId,
            buildingId,
        },
    });
    if (!userMembership) {
        throw new Error('Access denied: User is not a member of this building');
    }
    const members = await prisma.buildingMember.findMany({
        where: { buildingId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
        orderBy: { joinedAt: 'desc' },
    });
    return members.map((member) => ({
        id: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        role: member.role,
        joinedAt: member.joinedAt,
    }));
}
/**
 * Check if user is admin of a building
 * @param buildingId - Building ID
 * @param userId - User ID
 */
async function isBuildingAdmin(buildingId, userId) {
    const membership = await prisma.buildingMember.findFirst({
        where: {
            userId,
            buildingId,
        },
    });
    return membership?.role === 'ADMIN' || membership?.role === 'OWNER';
}
/**
 * Get dashboard metrics for admin
 * @param userId - User ID
 */
async function getDashboardMetrics(userId) {
    // Get all user's buildings
    const buildings = await prisma.building.count({
        where: {
            members: {
                some: {
                    userId: userId,
                },
            },
        },
    });
    // Get total apartments
    const apartments = await prisma.apartment.count({
        where: {
            building: {
                members: {
                    some: {
                        userId: userId,
                    },
                },
            },
        },
    });
    // Get total members across all user's buildings
    const members = await prisma.buildingMember.count({
        where: {
            building: {
                members: {
                    some: {
                        userId: userId,
                    },
                },
            },
        },
    });
    // Get recent activity (last 5 maintenance requests)
    const recentActivity = await prisma.maintenanceRequest.findMany({
        where: {
            apartment: {
                building: {
                    members: {
                        some: {
                            userId: userId,
                        },
                    },
                },
            },
        },
        select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            apartment: {
                select: {
                    unitNumber: true,
                    building: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
    });
    return {
        buildingCount: buildings,
        apartmentCount: apartments,
        memberCount: members,
        recentActivity: recentActivity.map((activity) => ({
            id: activity.id,
            title: activity.title,
            status: activity.status,
            apartmentNumber: activity.apartment.unitNumber,
            buildingName: activity.apartment.building.name,
            createdAt: activity.createdAt,
        })),
    };
}
//# sourceMappingURL=buildingService.js.map