/**
 * Centralized API Client with Auto Token Refresh
 *
 * Features:
 * - Automatic token refresh before expiration
 * - 401 error handling with retry after refresh
 * - Consistent error handling with toast notifications
 * - Built-in Zod validation support
 * - Auto-retry for transient failures
 * - Request timeout to fail fast
 * - Performance tracking for slow requests
 */

import { ZodSchema } from "zod";
import { toastError } from "@/lib/errors/toastError";
import { withRetry } from "@/lib/api/retry";
import { withTimeout } from "@/lib/api/withTimeout";
import { perfStart, perfEnd } from "@/lib/perf";
import { ENV } from "@/lib/system/env";
import { logger } from "@/lib/system/logger";
import { useAuthStore } from "@/stores/authStore";

// Token refresh mutex to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Parse JWT token to get expiration time
 */
function parseJwtExp(token: string): number | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

/**
 * Check if token needs refresh (expires within 2 minutes)
 */
function shouldRefreshToken(token: string | null): boolean {
    if (!token) return false;
    const exp = parseJwtExp(token);
    if (!exp) return false;
    // Refresh if token expires within 2 minutes
    return Date.now() + 120000 >= exp;
}

/**
 * Refresh the access token
 * Uses mutex to prevent multiple concurrent refresh attempts
 */
async function refreshTokenIfNeeded(): Promise<string | null> {
    const state = useAuthStore.getState();
    const { accessToken, refreshToken } = state;

    // No token = not logged in
    if (!accessToken) return null;

    // Token still valid
    if (!shouldRefreshToken(accessToken)) {
        return accessToken;
    }

    // No refresh token = can't refresh
    if (!refreshToken) {
        logger.warn('[API] Token expiring but no refresh token');
        return accessToken;
    }

    // Already refreshing - wait for that to complete
    if (isRefreshing && refreshPromise) {
        const success = await refreshPromise;
        return success ? useAuthStore.getState().accessToken : null;
    }

    // Start refresh
    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            logger.info('[API] Refreshing access token...');
            const res = await fetch(`${ENV.API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (!res.ok) {
                logger.error('[API] Token refresh failed:', res.status);
                return false;
            }

            const data = await res.json();
            if (data.success && data.data) {
                useAuthStore.getState().setTokens({
                    accessToken: data.data.accessToken,
                    refreshToken: data.data.refreshToken || refreshToken,
                });
                logger.info('[API] Token refreshed successfully');
                return true;
            }

            return false;
        } catch (error) {
            logger.error('[API] Token refresh error:', error);
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    const success = await refreshPromise;
    return success ? useAuthStore.getState().accessToken : null;
}

/**
 * Get auth header with fresh token
 */
async function getAuthHeader(): Promise<Record<string, string>> {
    const token = await refreshTokenIfNeeded();
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

/**
 * Handle 401 errors - try to refresh and retry once
 */
async function handleUnauthorized(
    requestFn: () => Promise<Response>
): Promise<Response> {
    const state = useAuthStore.getState();

    // Try to refresh token
    const refreshed = await state.refreshAuth();

    if (refreshed) {
        // Retry the request with new token
        return requestFn();
    }

    // Refresh failed - clear auth and redirect to login
    state.clearAuth();

    // Only redirect if we're in a browser context
    if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth/login') {
            window.location.href = `/auth/login?session=expired&returnTo=${encodeURIComponent(currentPath)}`;
        }
    }

    throw new Error('Session expired. Please log in again.');
}

/**
 * Execute API request with auth and 401 handling
 */
async function executeRequest(
    url: string,
    options: RequestInit
): Promise<Response> {
    const authHeader = await getAuthHeader();
    const headers = {
        ...authHeader,
        "Content-Type": "application/json",
        ...options.headers,
    };

    const requestFn = () => withTimeout(
        fetch(url, { ...options, headers })
    );

    const res = await requestFn();

    // Handle 401 - try refresh and retry
    if (res.status === 401) {
        return handleUnauthorized(async () => {
            const newAuthHeader = await getAuthHeader();
            return withTimeout(
                fetch(url, {
                    ...options,
                    headers: { ...newAuthHeader, "Content-Type": "application/json" },
                })
            );
        });
    }

    return res;
}

/**
 * GET request
 */
export async function apiGet<T>(
    url: string,
    schema?: ZodSchema<T>
): Promise<T | null> {
    // Use API_BASE if set, otherwise use relative URL (Vite proxy handles it)
    const fullUrl = ENV.API_BASE ? `${ENV.API_BASE}${url}` : url;
    const perfKey = `api:GET:${url}`;
    perfStart(perfKey);

    try {
        const result = await withRetry(async () => {
            const res = await executeRequest(fullUrl, {
                method: 'GET',
                cache: "no-store",
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            const data = json?.data ?? json;

            if (schema) {
                const parsed = schema.safeParse(data);
                if (!parsed.success) {
                    logger.error("Zod validation failed:", parsed.error);
                    throw new Error("Response validation failed");
                }
                return parsed.data;
            }

            return data as T;
        });

        perfEnd(perfKey);
        return result;
    } catch (err) {
        perfEnd(perfKey);
        toastError(err);
        return null;
    }
}

/**
 * POST request
 */
export async function apiPost<T>(
    url: string,
    body: unknown,
    schema?: ZodSchema<T>
): Promise<T | null> {
    // Use API_BASE if set, otherwise use relative URL (Vite proxy handles it)
    const fullUrl = ENV.API_BASE ? `${ENV.API_BASE}${url}` : url;
    const perfKey = `api:POST:${url}`;
    perfStart(perfKey);

    try {
        const result = await withRetry(async () => {
            const res = await executeRequest(fullUrl, {
                method: "POST",
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            const data = json?.data ?? json;

            if (schema) {
                const parsed = schema.safeParse(data);
                if (!parsed.success) {
                    logger.error("Zod validation failed:", parsed.error);
                    throw new Error("Response validation failed");
                }
                return parsed.data;
            }

            return data as T;
        });

        perfEnd(perfKey);
        return result;
    } catch (err) {
        perfEnd(perfKey);
        toastError(err);
        return null;
    }
}

/**
 * DELETE request
 */
export async function apiDelete<T>(
    url: string,
    schema?: ZodSchema<T>
): Promise<T | null> {
    // Use API_BASE if set, otherwise use relative URL (Vite proxy handles it)
    const fullUrl = ENV.API_BASE ? `${ENV.API_BASE}${url}` : url;
    const perfKey = `api:DELETE:${url}`;
    perfStart(perfKey);

    try {
        const result = await withRetry(async () => {
            const res = await executeRequest(fullUrl, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            const data = json?.data ?? json;

            if (schema) {
                const parsed = schema.safeParse(data);
                if (!parsed.success) {
                    logger.error("Zod validation failed:", parsed.error);
                    throw new Error("Response validation failed");
                }
                return parsed.data;
            }

            return data as T;
        });

        perfEnd(perfKey);
        return result;
    } catch (err) {
        perfEnd(perfKey);
        toastError(err);
        return null;
    }
}

/**
 * PUT request
 */
export async function apiPut<T>(
    url: string,
    body: unknown,
    schema?: ZodSchema<T>
): Promise<T | null> {
    // Use API_BASE if set, otherwise use relative URL (Vite proxy handles it)
    const fullUrl = ENV.API_BASE ? `${ENV.API_BASE}${url}` : url;
    const perfKey = `api:PUT:${url}`;
    perfStart(perfKey);

    try {
        const result = await withRetry(async () => {
            const res = await executeRequest(fullUrl, {
                method: "PUT",
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            const data = json?.data ?? json;

            if (schema) {
                const parsed = schema.safeParse(data);
                if (!parsed.success) {
                    logger.error("Zod validation failed:", parsed.error);
                    throw new Error("Response validation failed");
                }
                return parsed.data;
            }

            return data as T;
        });

        perfEnd(perfKey);
        return result;
    } catch (err) {
        perfEnd(perfKey);
        toastError(err);
        return null;
    }
}
