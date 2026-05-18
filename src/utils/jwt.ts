/**
 * JWT Utilities
 * Handles JWT token generation, verification, and refresh logic
 */

import jwt from 'jsonwebtoken';
import type { JWTPayload } from '@types/auth';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access token
 * @param payload - JWT payload containing user info
 * @returns Signed JWT access token
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token
 * @param payload - JWT payload containing user info
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify access token and extract payload
 * @param token - JWT access token
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as JWTPayload;
  } catch (_error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify refresh token and extract payload
 * @param token - JWT refresh token
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload;
  } catch (_error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Generate both access and refresh tokens
 * @param payload - JWT payload
 * @returns Object with both tokens
 */
export function generateTokenPair(payload: JWTPayload): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Decode token without verification (useful for debugging)
 * @param token - JWT token
 * @returns Decoded payload
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (_error) {
    return null;
  }
}
