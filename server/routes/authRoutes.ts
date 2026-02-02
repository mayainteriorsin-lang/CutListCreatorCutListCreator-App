import { Router } from 'express';
import { authService } from '../services/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { auditService } from '../services/auditService';

const router = Router();

/**
 * POST /api/auth/register
 * Register new tenant and admin user
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, tenantName } = req.body;

        // Validation
        if (!email || !password || !fullName || !tenantName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['email', 'password', 'fullName', 'tenantName']
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
        }

        const result = await authService.register({
            email,
            password,
            fullName,
            tenantName,
        });

        // Log registration
        await auditService.log({
            tenantId: result.user.tenantId,
            userId: result.user.userId,
            action: 'user.register',
            resourceType: 'user',
            resourceId: result.user.userId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message || 'Registration failed'
        });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password required'
            });
        }

        // DEV MODE: Direct bypass for default credentials (no DB required)
        if (process.env.NODE_ENV !== 'production' &&
            email === 'admin@cutlist.pro' &&
            password === 'admin123') {

            const jwt = await import('jsonwebtoken');
            const { nanoid } = await import('nanoid');

            const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
            const devUser = {
                userId: 'dev-admin-001',
                email: 'admin@cutlist.pro',
                role: 'admin',
                tenantId: 'dev-tenant-001',
            };

            const accessToken = jwt.default.sign(devUser, JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.default.sign(
                { ...devUser, tokenId: nanoid(64) },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log('[Auth] Dev mode login successful for:', email);

            return res.json({
                success: true,
                data: {
                    accessToken,
                    refreshToken,
                    user: devUser,
                }
            });
        }

        const result = await authService.login(email, password);

        // Log login (only for non-dev logins)
        try {
            await auditService.log({
                tenantId: result.user.tenantId,
                userId: result.user.userId,
                action: 'user.login',
                resourceType: 'user',
                resourceId: result.user.userId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
        } catch (auditError) {
            console.error('[Auth] Audit log failed:', auditError);
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[Auth] Login error:', error);
        res.status(401).json({
            success: false,
            error: error.message || 'Login failed'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        const tokens = await authService.refreshToken(refreshToken);

        res.json({
            success: true,
            data: tokens
        });
    } catch (error: any) {
        res.status(401).json({
            success: false,
            error: error.message || 'Token refresh failed'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 */
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await authService.revokeRefreshToken(refreshToken);
        }

        // Log logout
        if (req.user) {
            await auditService.log({
                tenantId: req.user.tenantId,
                userId: req.user.userId,
                action: 'user.logout',
                resourceType: 'user',
                resourceId: req.user.userId,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Logout failed'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: AuthRequest, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

/**
 * POST /api/auth/logout-all
 * Revoke all refresh tokens for current user
 */
router.post('/logout-all', authenticate, async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        await authService.revokeAllUserTokens(req.user.userId);

        // Log logout all
        await auditService.log({
            tenantId: req.user.tenantId,
            userId: req.user.userId,
            action: 'user.logout_all',
            resourceType: 'user',
            resourceId: req.user.userId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.json({
            success: true,
            message: 'All sessions terminated'
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Logout all failed'
        });
    }
});

export default router;
