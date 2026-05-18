/**
 * Building Service
 * Handles building operations, member management, and data retrieval
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all buildings where user is a member/owner
 * @param userId - User ID
 * @param limit - Pagination limit
 * @param offset - Pagination offset
 */
export async function getUserBuildings(userId: string, limit = 10, offset = 0) {
  // Get buildings through BuildingMember relationship
  const buildings = await prisma.building.findMany({
    where: {
      buildingMembers: {
        some: {
          userId: userId,
        },
      },
    },
    include: {
      buildingMembers: {
        where: { userId: userId },
        select: { role: true },
      },
      _count: {
        select: {
          apartments: true,
          buildingMembers: true,
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
    province: building.province,
    zipCode: building.zipCode,
    userRole: building.buildingMembers[0]?.role,
    apartmentCount: building._count.apartments,
    memberCount: building._count.buildingMembers,
    createdAt: building.createdAt,
  }));
}

/**
 * Get single building details
 * @param buildingId - Building ID
 * @param userId - User ID (for permission check)
 */
export async function getBuildingDetails(buildingId: string, userId: string) {
  // Check if user is member of this building
  const userMembership = await prisma.buildingMember.findUnique({
    where: {
      userId_buildingId: {
        userId,
        buildingId,
      },
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
          buildingMembers: true,
          maintenanceRequests: true,
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
export async function getBuildingMembers(buildingId: string, userId: string) {
  // Verify user is member
  const userMembership = await prisma.buildingMember.findUnique({
    where: {
      userId_buildingId: {
        userId,
        buildingId,
      },
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
    orderBy: { createdAt: 'desc' },
  });

  return members.map((member) => ({
    id: member.user.id,
    email: member.user.email,
    firstName: member.user.firstName,
    lastName: member.user.lastName,
    role: member.role,
    joinedAt: member.createdAt,
  }));
}

/**
 * Check if user is admin of a building
 * @param buildingId - Building ID
 * @param userId - User ID
 */
export async function isBuildingAdmin(buildingId: string, userId: string): Promise<boolean> {
  const membership = await prisma.buildingMember.findUnique({
    where: {
      userId_buildingId: {
        userId,
        buildingId,
      },
    },
  });

  return membership?.role === 'ADMIN' || membership?.role === 'OWNER';
}

/**
 * Get dashboard metrics for admin
 * @param userId - User ID
 */
export async function getDashboardMetrics(userId: string) {
  // Get all user's buildings
  const buildings = await prisma.building.count({
    where: {
      buildingMembers: {
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
        buildingMembers: {
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
        buildingMembers: {
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
          buildingMembers: {
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
          number: true,
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
      apartmentNumber: activity.apartment.number,
      buildingName: activity.apartment.building.name,
      createdAt: activity.createdAt,
    })),
  };
}
