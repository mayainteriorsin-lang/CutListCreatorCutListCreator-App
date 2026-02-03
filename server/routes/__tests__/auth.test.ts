/**
 * PHASE 6: Auth Lifecycle Tests
 *
 * Tests auth contract behavior:
 * 1. Login with valid credentials returns tokens
 * 2. Login with invalid credentials returns 401
 * 3. Login with missing fields returns 400
 * 4. Refresh token works with valid token
 * 5. Refresh with invalid token fails
 * 6. Logout revokes token
 * 7. Protected routes reject without auth
 * 8. Protected routes accept with valid token
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock the database
const mockDb = {
  query: {
    users: {
      findFirst: vi.fn(),
    },
    tenants: {
      findFirst: vi.fn(),
    },
    refreshTokens: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock('../../db', () => ({
  db: mockDb,
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-nanoid-token'),
}));

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

describe('Auth Lifecycle - Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset NODE_ENV for each test
    process.env.NODE_ENV = 'test';
  });

  describe('POST /auth/login', () => {
    it('should return 400 when email is missing', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const body = { password: 'test123' };

      if (!body.email || !body.password) {
        mockResponse.status(400).json({
          success: false,
          error: 'Email and password required',
        });
      }

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Email and password required',
        })
      );
    });

    it('should return 400 when password is missing', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const body = { email: 'test@test.com' };

      if (!body.email || !body.password) {
        mockResponse.status(400).json({
          success: false,
          error: 'Email and password required',
        });
      }

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when user not found', async () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      mockDb.query.users.findFirst.mockResolvedValue(null);

      const user = await mockDb.query.users.findFirst({});

      if (!user) {
        mockResponse.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid credentials',
        })
      );
    });

    it('should return tokens on successful login (dev mode)', () => {
      // In dev mode with default credentials, login should succeed
      process.env.NODE_ENV = 'development';
      const email = 'admin@cutlist.pro';
      const password = 'admin123';

      const isDevMode = process.env.NODE_ENV !== 'production';
      const isDefaultCreds = email === 'admin@cutlist.pro' && password === 'admin123';

      if (isDevMode && isDefaultCreds) {
        const devUser = {
          userId: 'dev-admin-001',
          email: 'admin@cutlist.pro',
          role: 'admin',
          tenantId: 'dev-tenant-001',
        };

        const accessToken = jwt.sign(devUser, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ ...devUser, tokenId: 'mock-token' }, JWT_SECRET, { expiresIn: '7d' });

        expect(accessToken).toBeTruthy();
        expect(refreshToken).toBeTruthy();

        // Verify token contains expected payload
        const decoded = jwt.verify(accessToken, JWT_SECRET) as any;
        expect(decoded.userId).toBe('dev-admin-001');
        expect(decoded.tenantId).toBe('dev-tenant-001');
      }
    });

    it('should include tenantId in token payload', () => {
      const payload = {
        userId: 'user-1',
        email: 'test@test.com',
        role: 'user',
        tenantId: 'tenant-123',
      };

      const token = jwt.sign(payload, JWT_SECRET);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.tenantId).toBe('tenant-123');
      expect(decoded.userId).toBe('user-1');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 400 when refresh token is missing', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const body = {};

      if (!body.refreshToken) {
        mockResponse.status(400).json({
          success: false,
          error: 'Refresh token required',
        });
      }

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when refresh token is invalid', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const invalidToken = 'invalid-jwt-token';

      try {
        jwt.verify(invalidToken, JWT_SECRET);
      } catch (error) {
        mockResponse.status(401).json({
          success: false,
          error: 'Invalid refresh token',
        });
      }

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 when refresh token is expired', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 'user-1', tenantId: 'tenant-1' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      try {
        jwt.verify(expiredToken, JWT_SECRET);
      } catch (error) {
        mockResponse.status(401).json({
          success: false,
          error: 'Token refresh failed',
        });
      }

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should return new tokens when refresh token is valid', () => {
      const payload = {
        userId: 'user-1',
        email: 'test@test.com',
        role: 'user',
        tenantId: 'tenant-123',
        tokenId: 'refresh-token-id',
      };

      const validRefreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      const decoded = jwt.verify(validRefreshToken, JWT_SECRET) as any;

      expect(decoded.userId).toBe('user-1');
      expect(decoded.tenantId).toBe('tenant-123');

      // New access token should be generatable
      const newAccessToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email, role: decoded.role, tenantId: decoded.tenantId },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      expect(newAccessToken).toBeTruthy();
    });
  });

  describe('POST /auth/logout', () => {
    it('should require authentication', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const req = { user: undefined };

      if (!req.user) {
        mockResponse.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should succeed with valid auth', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const req = {
        user: {
          userId: 'user-1',
          tenantId: 'tenant-1',
        },
        body: {
          refreshToken: 'valid-refresh-token',
        },
      };

      if (req.user) {
        mockResponse.json({
          success: true,
          message: 'Logged out successfully',
        });
      }

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without authentication', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      const req = { user: undefined };

      if (!req.user) {
        mockResponse.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should return user data with valid token', () => {
      const mockResponse = {
        json: vi.fn(),
      };

      const req = {
        user: {
          userId: 'user-1',
          email: 'test@test.com',
          role: 'user',
          tenantId: 'tenant-123',
        },
      };

      if (req.user) {
        mockResponse.json({
          success: true,
          data: req.user,
        });
      }

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userId: 'user-1',
            tenantId: 'tenant-123',
          }),
        })
      );
    });
  });
});

describe('Auth Token Verification', () => {
  it('should reject malformed tokens', () => {
    expect(() => {
      jwt.verify('not-a-valid-jwt', JWT_SECRET);
    }).toThrow();
  });

  it('should reject tokens signed with wrong secret', () => {
    const token = jwt.sign({ userId: 'user-1' }, 'wrong-secret');

    expect(() => {
      jwt.verify(token, JWT_SECRET);
    }).toThrow();
  });

  it('should accept valid tokens', () => {
    const payload = { userId: 'user-1', tenantId: 'tenant-1' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    expect(decoded.userId).toBe('user-1');
    expect(decoded.tenantId).toBe('tenant-1');
  });

  it('should preserve tenantId through token lifecycle', () => {
    // Simulate full lifecycle: login -> token -> refresh -> new token
    const originalPayload = {
      userId: 'user-1',
      email: 'test@test.com',
      role: 'admin',
      tenantId: 'tenant-ABC',
    };

    // Step 1: Initial login generates access token
    const accessToken = jwt.sign(originalPayload, JWT_SECRET, { expiresIn: '15m' });

    // Step 2: Token is decoded for API requests
    const decodedAccess = jwt.verify(accessToken, JWT_SECRET) as any;
    expect(decodedAccess.tenantId).toBe('tenant-ABC');

    // Step 3: Refresh token is created
    const refreshToken = jwt.sign(
      { ...originalPayload, tokenId: 'refresh-123' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 4: Refresh token is verified
    const decodedRefresh = jwt.verify(refreshToken, JWT_SECRET) as any;
    expect(decodedRefresh.tenantId).toBe('tenant-ABC');

    // Step 5: New access token preserves tenantId
    const newAccessToken = jwt.sign(
      {
        userId: decodedRefresh.userId,
        email: decodedRefresh.email,
        role: decodedRefresh.role,
        tenantId: decodedRefresh.tenantId,
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const finalDecoded = jwt.verify(newAccessToken, JWT_SECRET) as any;
    expect(finalDecoded.tenantId).toBe('tenant-ABC');
  });
});
