"use strict";
/**
 * Authentication Service
 * Handles user registration, login, token generation, and refresh
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshAccessToken = refreshAccessToken;
exports.getUserById = getUserById;
const client_1 = require("@prisma/client");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const prisma = new client_1.PrismaClient();
/**
 * Register a new user
 * @param data - Registration data (email, password, firstName, lastName)
 * @returns Created user object with tokens
 * @throws Error if email already exists or validation fails
 */
async function registerUser(data) {
    const { email, password, firstName, lastName } = data;
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }
    // Validate password strength
    if (!(0, password_1.validatePasswordStrength)(password)) {
        throw new Error('Password must be at least 8 characters with uppercase letter and number');
    }
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new Error('Email already registered');
    }
    // Hash password
    const hashedPassword = await (0, password_1.hashPassword)(password);
    // Create user in database
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'OWNER',
            status: 'ACTIVE',
        },
    });
    // Generate tokens
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)(payload);
    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        },
        accessToken,
        refreshToken,
    };
}
/**
 * Login user with email and password
 * @param data - Login credentials (email, password)
 * @returns User object with tokens
 * @throws Error if credentials are invalid
 */
async function loginUser(data) {
    const { email, password } = data;
    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new Error('Invalid email or password');
    }
    // Compare passwords
    const passwordMatch = await (0, password_1.comparePassword)(password, user.password);
    if (!passwordMatch) {
        throw new Error('Invalid email or password');
    }
    // Check if user is active
    if (user.status !== 'ACTIVE') {
        throw new Error('User account is not active');
    }
    // Generate tokens
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const { accessToken, refreshToken } = (0, jwt_1.generateTokenPair)(payload);
    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        },
        accessToken,
        refreshToken,
    };
}
/**
 * Refresh access token using refresh token
 * @param refreshToken - Refresh token from client
 * @returns New access token and refresh token
 * @throws Error if refresh token is invalid
 */
async function refreshAccessToken(refreshToken) {
    // Verify refresh token
    const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
    });
    if (!user || user.status !== 'ACTIVE') {
        throw new Error('User not found or inactive');
    }
    // Generate new token pair
    const newPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const { accessToken, refreshToken: newRefreshToken } = (0, jwt_1.generateTokenPair)(newPayload);
    return {
        accessToken,
        refreshToken: newRefreshToken,
    };
}
/**
 * Get user by ID (for authenticated endpoints)
 * @param userId - User ID from JWT payload
 * @returns User object without password
 */
async function getUserById(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            createdAt: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
}
//# sourceMappingURL=authService.js.map