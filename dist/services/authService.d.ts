/**
 * Authentication Service
 * Handles user registration, login, token generation, and refresh
 */
import { LoginRequest, RegisterRequest } from '@types/auth';
/**
 * Register a new user
 * @param data - Registration data (email, password, firstName, lastName)
 * @returns Created user object with tokens
 * @throws Error if email already exists or validation fails
 */
export declare function registerUser(data: RegisterRequest): Promise<{
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
    accessToken: string;
    refreshToken: string;
}>;
/**
 * Login user with email and password
 * @param data - Login credentials (email, password)
 * @returns User object with tokens
 * @throws Error if credentials are invalid
 */
export declare function loginUser(data: LoginRequest): Promise<{
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
    accessToken: string;
    refreshToken: string;
}>;
/**
 * Refresh access token using refresh token
 * @param refreshToken - Refresh token from client
 * @returns New access token and refresh token
 * @throws Error if refresh token is invalid
 */
export declare function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
}>;
/**
 * Get user by ID (for authenticated endpoints)
 * @param userId - User ID from JWT payload
 * @returns User object without password
 */
export declare function getUserById(userId: string): Promise<{
    id: string;
    status: import(".prisma/client").$Enums.UserStatus;
    createdAt: Date;
    role: import(".prisma/client").$Enums.UserRole;
    email: string;
    firstName: string;
    lastName: string;
}>;
//# sourceMappingURL=authService.d.ts.map