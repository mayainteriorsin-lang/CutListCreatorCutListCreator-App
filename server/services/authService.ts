import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, tenants, refreshTokens } from '../db/authSchema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SALT_ROUNDS = 10;

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface UserPayload {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
}

export interface RegisterParams {
    email: string;
    password: string;
    fullName: string;
    tenantName: string;
}

export interface LoginResponse extends AuthTokens {
    user: UserPayload;
}

/**
 * Authentication Service
 * Handles user registration, login, token management
 */
export class AuthService {
    /**
     * Register a new tenant and admin user
     */
    async register(params: RegisterParams): Promise<LoginResponse> {
        const { email, password, fullName, tenantName } = params;

        // Check if email already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Create tenant
        const [tenant] = await db.insert(tenants).values({
            name: tenantName,
            slug: this.generateSlug(tenantName),
            plan: 'free',
            status: 'active',
        }).returning();

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user (first user is admin)
        const [user] = await db.insert(users).values({
            email,
            passwordHash,
            fullName,
            role: 'admin',
            tenantId: tenant!.id,
            emailVerified: false,
        }).returning();

        // Generate tokens
        const payload: UserPayload = {
            userId: user!.id,
            email: user!.email,
            role: user!.role as any,
            tenantId: user!.tenantId!,
        };

        const tokens = await this.generateTokens(payload);

        return {
            ...tokens,
            user: payload,
        };
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        // DEV MODE: Allow default admin login without database
        if (process.env.NODE_ENV !== 'production' &&
            email === 'admin@cutlist.pro' &&
            password === 'admin123') {
            const devPayload: UserPayload = {
                userId: 'dev-admin-001',
                email: 'admin@cutlist.pro',
                role: 'admin',
                tenantId: 'dev-tenant-001',
            };

            // Generate mock tokens for dev mode
            const accessToken = jwt.sign(devPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            const refreshTokenJWT = jwt.sign(
                { ...devPayload, tokenId: nanoid(64) },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return {
                accessToken,
                refreshToken: refreshTokenJWT,
                user: devPayload,
            };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        // Check if tenant is active
        if (user.tenantId) {
            const tenant = await db.query.tenants.findFirst({
                where: eq(tenants.id, user.tenantId),
            });

            if (tenant?.status !== 'active') {
                throw new Error('Account is not active');
            }
        }

        // Update last login
        await db.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

        // Generate tokens
        const payload: UserPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId!,
        };

        const tokens = await this.generateTokens(payload);

        return {
            ...tokens,
            user: payload,
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshTokenValue: string): Promise<AuthTokens> {
        // Verify refresh token
        let payload: UserPayload;
        try {
            payload = jwt.verify(refreshTokenValue, JWT_SECRET) as UserPayload;
        } catch (error) {
            throw new Error('Invalid refresh token');
        }

        // Check if refresh token exists and is not revoked
        const storedToken = await db.query.refreshTokens.findFirst({
            where: and(
                eq(refreshTokens.token, refreshTokenValue),
                eq(refreshTokens.userId, payload.userId)
            ),
        });

        if (!storedToken) {
            throw new Error('Refresh token not found');
        }

        if (storedToken.revokedAt) {
            throw new Error('Refresh token has been revoked');
        }

        if (new Date() > storedToken.expiresAt) {
            throw new Error('Refresh token has expired');
        }

        // Generate new tokens
        return await this.generateTokens(payload);
    }

    /**
     * Verify and decode access token
     */
    verifyToken(token: string): UserPayload {
        try {
            return jwt.verify(token, JWT_SECRET) as UserPayload;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Revoke a refresh token (logout)
     */
    async revokeRefreshToken(refreshTokenValue: string): Promise<void> {
        await db.update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(eq(refreshTokens.token, refreshTokenValue));
    }

    /**
     * Revoke all refresh tokens for a user
     */
    async revokeAllUserTokens(userId: string): Promise<void> {
        await db.update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(eq(refreshTokens.userId, userId));
    }

    /**
     * Generate access and refresh tokens
     */
    private async generateTokens(payload: UserPayload): Promise<AuthTokens> {
        // Generate access token (short-lived)
        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Generate refresh token (long-lived)
        const refreshTokenValue = nanoid(64);
        const refreshTokenJWT = jwt.sign(
            { ...payload, tokenId: refreshTokenValue },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Store refresh token in database
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);
        await db.insert(refreshTokens).values({
            userId: payload.userId,
            token: refreshTokenValue,
            expiresAt,
        });

        return {
            accessToken,
            refreshToken: refreshTokenJWT,
        };
    }

    /**
     * Generate URL-safe slug from tenant name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100) + '-' + nanoid(6);
    }

    /**
     * Clean up expired refresh tokens (run periodically)
     */
    async cleanupExpiredTokens(): Promise<number> {
        const result = await db.delete(refreshTokens)
            .where(eq(refreshTokens.expiresAt, new Date()));

        return result.rowCount || 0;
    }

    /**
     * Reset password for a user by email
     * Returns true if successful, throws error if user not found
     */
    async resetPassword(email: string, newPassword: string): Promise<boolean> {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password
        await db.update(users)
            .set({
                passwordHash,
                updatedAt: new Date()
            })
            .where(eq(users.id, user.id));

        // Revoke all existing tokens for security
        await this.revokeAllUserTokens(user.id);

        return true;
    }

    /**
     * Admin: Reset password to default
     * Only for admin use - resets to a known default password
     */
    async adminResetPassword(email: string): Promise<string> {
        const defaultPassword = 'Reset@123';
        await this.resetPassword(email, defaultPassword);
        return defaultPassword;
    }
}

export const authService = new AuthService();
