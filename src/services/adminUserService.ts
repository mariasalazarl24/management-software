import { prisma } from '../db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAdminTokenPair } from '../middleware/adminAuth';
import { CreateAdminUserRequest, AdminLoginRequest, UpdateAdminUserRequest, AdminRole } from '../types/admin';

export const adminUserService = {
  /**
   * Create a new admin user
   */
  async create(data: CreateAdminUserRequest) {
    // Check if email already exists
    const existingUser = await prisma.buildHubAdminUser.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Validate role
    const validRoles: AdminRole[] = ['SUPERADMIN', 'ADMIN_DASHBOARD'];
    if (!validRoles.includes(data.role)) {
      throw new Error('Invalid admin role');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await prisma.buildHubAdminUser.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        status: 'ACTIVE',
      },
    });

    // Return user without password
    return this.sanitizeUser(user);
  },

  /**
   * Authenticate admin user and return tokens
   */
  async login(data: AdminLoginRequest) {
    // Find user by email
    const user = await prisma.buildHubAdminUser.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if account is active
    if (user.status !== 'ACTIVE') {
      throw new Error('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateAdminTokenPair({
      adminId: user.id,
      email: user.email,
      role: user.role as AdminRole,
    });

    return {
      ...tokens,
      admin: this.sanitizeUser(user),
    };
  },

  /**
   * Get admin user by ID
   */
  async getById(adminId: string) {
    const user = await prisma.buildHubAdminUser.findUnique({
      where: { id: adminId },
    });

    if (!user) {
      throw new Error('Admin user not found');
    }

    return this.sanitizeUser(user);
  },

  /**
   * List all admin users
   */
  async listAll(limit: number = 50, offset: number = 0) {
    const users = await prisma.buildHubAdminUser.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const total = await prisma.buildHubAdminUser.count();

    return {
      data: users,
      pagination: {
        limit,
        offset,
        total,
      },
    };
  },

  /**
   * Update admin user
   */
  async update(adminId: string, updates: UpdateAdminUserRequest) {
    // Check if user exists
    const user = await prisma.buildHubAdminUser.findUnique({
      where: { id: adminId },
    });

    if (!user) {
      throw new Error('Admin user not found');
    }

    // Validate role if provided
    if (updates.role) {
      const validRoles: AdminRole[] = ['SUPERADMIN', 'ADMIN_DASHBOARD'];
      if (!validRoles.includes(updates.role)) {
        throw new Error('Invalid admin role');
      }
    }

    // Update user
    const updatedUser = await prisma.buildHubAdminUser.update({
      where: { id: adminId },
      data: {
        firstName: updates.firstName,
        lastName: updates.lastName,
        role: updates.role,
        status: updates.status,
      },
    });

    return this.sanitizeUser(updatedUser);
  },

  /**
   * Reset admin user password (by another admin)
   * Logs the action to PasswordResetLog
   */
  async resetPassword(userId: string, newPassword: string, resetByAdminId: string) {
    // Check if user exists
    const user = await prisma.buildHubAdminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Admin user not found');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.buildHubAdminUser.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Log the password reset (if PasswordResetLog has admin support)
    try {
      await prisma.passwordResetLog.create({
        data: {
          resetById: resetByAdminId,
          resetByRole: 'ADMIN',
          userEmail: user.email,
          userRole: 'ADMIN',
        },
      });
    } catch (error) {
      // Silently fail if logging is not available
      console.warn('Could not log password reset');
    }

    return { success: true, message: 'Password reset successfully' };
  },

  /**
   * Deactivate admin user
   */
  async deactivate(adminId: string) {
    const user = await prisma.buildHubAdminUser.findUnique({
      where: { id: adminId },
    });

    if (!user) {
      throw new Error('Admin user not found');
    }

    const updated = await prisma.buildHubAdminUser.update({
      where: { id: adminId },
      data: { status: 'INACTIVE' },
    });

    return this.sanitizeUser(updated);
  },

  /**
   * Reactivate admin user
   */
  async reactivate(adminId: string) {
    const user = await prisma.buildHubAdminUser.findUnique({
      where: { id: adminId },
    });

    if (!user) {
      throw new Error('Admin user not found');
    }

    const updated = await prisma.buildHubAdminUser.update({
      where: { id: adminId },
      data: { status: 'ACTIVE' },
    });

    return this.sanitizeUser(updated);
  },

  /**
   * Remove password from user object for safe return
   */
  sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  },
};

// Helper function to sanitize user
export function sanitizeAdminUser(user: any) {
  const { password, ...sanitized } = user;
  return sanitized;
}
