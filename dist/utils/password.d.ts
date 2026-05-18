/**
 * Password Utilities
 * Handles password hashing and verification using bcrypt
 */
/**
 * Hash a plain text password
 * @param password - Plain text password
 * @returns Hashed password
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Compare plain text password with hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns true if passwords match, false otherwise
 */
export declare function comparePassword(password: string, hashedPassword: string): Promise<boolean>;
/**
 * Validate password strength
 * Minimum 8 characters, at least one uppercase, one number
 * @param password - Password to validate
 * @returns true if password is strong, false otherwise
 */
export declare function validatePasswordStrength(password: string): boolean;
//# sourceMappingURL=password.d.ts.map