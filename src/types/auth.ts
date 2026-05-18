/**
 * Authentication Types
 * Defines TypeScript interfaces for JWT, auth requests/responses, and authenticated user data
 */

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'BOARD_MEMBER';
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: 'OWNER' | 'ADMIN' | 'BOARD_MEMBER';
    };
  };
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'BOARD_MEMBER';
}
