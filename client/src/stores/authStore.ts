/**
 * Auth Store - Unified Authentication State Management
 *
 * Zustand store with localStorage persistence for managing:
 * - User session state
 * - JWT tokens (access + refresh)
 * - Token refresh logic
 * - Hydration state tracking
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// API base URL
const API_BASE = '/api';

/**
 * User interface matching backend response
 */
export interface User {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
    name?: string;
}

/**
 * Auth state interface
 */
export interface AuthState {
    // State
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isHydrated: boolean;

    // Actions
    setAuth: (tokens: { accessToken: string; refreshToken: string }, user: User) => void;
    setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
    logout: () => Promise<void>;
    clearAuth: () => void;
    refreshAuth: () => Promise<boolean>;
    setHydrated: (hydrated: boolean) => void;
}

/**
 * Parse JWT token payload
 */
function parseJwt(token: string): { exp: number; userId: string; email: string; role: string; tenantId: string } | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Check if token is expired or will expire within buffer time
 */
function isTokenExpiringSoon(token: string, bufferMs: number = 60000): boolean {
    const payload = parseJwt(token);
    if (!payload) return true;
    const expiresAt = payload.exp * 1000;
    return Date.now() + bufferMs >= expiresAt;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isHydrated: false,

            /**
             * Set auth state after login/register
             */
            setAuth: (tokens, user) =>
                set({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    user,
                    isAuthenticated: true,
                }),

            /**
             * Update tokens only (after refresh)
             */
            setTokens: (tokens) =>
                set({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                }),

            /**
             * Logout - clears state and calls API to revoke token
             */
            logout: async () => {
                const { refreshToken, accessToken } = get();

                // Clear state immediately
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });

                // Call logout API to revoke refresh token
                if (refreshToken && accessToken) {
                    try {
                        await fetch(`${API_BASE}/auth/logout`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({ refreshToken }),
                        });
                    } catch (error) {
                        console.error('[Auth] Logout API call failed:', error);
                    }
                }
            },

            /**
             * Clear auth state immediately (no API call)
             */
            clearAuth: () =>
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                }),

            /**
             * Refresh access token using refresh token
             * Returns true if refresh succeeded, false otherwise
             */
            refreshAuth: async () => {
                const { refreshToken, accessToken } = get();

                if (!refreshToken) {
                    console.log('[Auth] No refresh token available');
                    return false;
                }

                // Check if access token is still valid (not expiring soon)
                if (accessToken && !isTokenExpiringSoon(accessToken, 120000)) {
                    return true; // Token still valid
                }

                try {
                    const res = await fetch(`${API_BASE}/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken }),
                    });

                    if (!res.ok) {
                        console.error('[Auth] Token refresh failed:', res.status);
                        get().clearAuth();
                        return false;
                    }

                    const data = await res.json();
                    if (data.success && data.data) {
                        set({
                            accessToken: data.data.accessToken,
                            refreshToken: data.data.refreshToken || refreshToken,
                        });
                        console.log('[Auth] Token refreshed successfully');
                        return true;
                    }

                    get().clearAuth();
                    return false;
                } catch (error) {
                    console.error('[Auth] Token refresh error:', error);
                    get().clearAuth();
                    return false;
                }
            },

            /**
             * Set hydration state (called after localStorage restore)
             */
            setHydrated: (hydrated) => set({ isHydrated: hydrated }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            // Track hydration completion
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHydrated(true);
                }
            },
        }
    )
);

/**
 * Helper: Get current access token (for API calls)
 */
export const getAccessToken = (): string | null => {
    return useAuthStore.getState().accessToken;
};

/**
 * Helper: Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return useAuthStore.getState().isAuthenticated;
};

/**
 * Helper: Get current user
 */
export const getCurrentUser = (): User | null => {
    return useAuthStore.getState().user;
};
