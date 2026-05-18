"use strict";
/**
 * JWT Utilities
 * Handles JWT token generation, verification, and refresh logic
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.generateTokenPair = generateTokenPair;
exports.decodeToken = decodeToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
/**
 * Generate access token
 * @param payload - JWT payload containing user info
 * @returns Signed JWT access token
 */
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
}
/**
 * Generate refresh token
 * @param payload - JWT payload containing user info
 * @returns Signed JWT refresh token
 */
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
}
/**
 * Verify access token and extract payload
 * @param token - JWT access token
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
function verifyAccessToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
    }
    catch (_error) {
        throw new Error('Invalid or expired access token');
    }
}
/**
 * Verify refresh token and extract payload
 * @param token - JWT refresh token
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
function verifyRefreshToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, REFRESH_TOKEN_SECRET);
    }
    catch (_error) {
        throw new Error('Invalid or expired refresh token');
    }
}
/**
 * Generate both access and refresh tokens
 * @param payload - JWT payload
 * @returns Object with both tokens
 */
function generateTokenPair(payload) {
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
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch (_error) {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map