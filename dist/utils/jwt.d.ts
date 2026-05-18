/**
 * JWT Utilities
 * Handles JWT token generation, verification, and refresh logic
 */
import { JWTPayload } from '@types/auth';
/**
 * Generate access token
 * @param payload - JWT payload containing user info
 * @returns Signed JWT access token
 */
export declare function generateAccessToken(payload: JWTPayload): string;
/**
 * Generate refresh token
 * @param payload - JWT payload containing user info
 * @returns Signed JWT refresh token
 */
export declare function generateRefreshToken(payload: JWTPayload): string;
/**
 * Verify access token and extract payload
 * @param token - JWT access token
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export declare function verifyAccessToken(token: string): JWTPayload;
/**
 * Verify refresh token and extract payload
 * @param token - JWT refresh token
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export declare function verifyRefreshToken(token: string): JWTPayload;
/**
 * Generate both access and refresh tokens
 * @param payload - JWT payload
 * @returns Object with both tokens
 */
export declare function generateTokenPair(payload: JWTPayload): {
    accessToken: string;
    refreshToken: string;
};
/**
 * Decode token without verification (useful for debugging)
 * @param token - JWT token
 * @returns Decoded payload
 */
export declare function decodeToken(token: string): JWTPayload | null;
//# sourceMappingURL=jwt.d.ts.map