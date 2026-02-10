/**
 * PHASE 16: Distributed State Store Abstraction
 *
 * Provides a unified interface for state storage that can use:
 * - In-memory Map (development/single instance)
 * - Redis (production/multi-instance)
 *
 * Usage:
 *   const store = getStateStore();
 *   await store.set('key', value, ttlMs);
 *   const value = await store.get('key');
 *
 * Configuration:
 *   Set REDIS_URL environment variable to enable Redis backend
 *   Otherwise falls back to in-memory storage
 */

import Redis from 'ioredis';

export interface StateStore {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    increment(key: string, ttlMs?: number): Promise<number>;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T>;
}

/**
 * In-Memory State Store
 * For development and single-instance deployments
 */
class MemoryStateStore implements StateStore {
    private store = new Map<string, { value: unknown; expiresAt: number | null }>();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Clean up expired entries every 60 seconds
        this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAt && entry.expiresAt < now) {
                this.store.delete(key);
            }
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.store.get(key);
        if (!entry) return null;

        if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.store.delete(key);
            return null;
        }

        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
        const expiresAt = ttlMs ? Date.now() + ttlMs : null;
        this.store.set(key, { value, expiresAt });
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    async increment(key: string, ttlMs?: number): Promise<number> {
        const entry = this.store.get(key);
        let newValue: number;

        if (!entry || (entry.expiresAt && entry.expiresAt < Date.now())) {
            newValue = 1;
            const expiresAt = ttlMs ? Date.now() + ttlMs : null;
            this.store.set(key, { value: newValue, expiresAt });
        } else {
            newValue = (entry.value as number) + 1;
            entry.value = newValue;
        }

        return newValue;
    }

    async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
        const existing = await this.get<T>(key);
        if (existing !== null) return existing;

        const value = await factory();
        await this.set(key, value, ttlMs);
        return value;
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}

/**
 * Redis State Store
 * For production multi-instance deployments
 *
 * Features:
 * - Automatic reconnection
 * - Connection pooling via ioredis
 * - TTL support with PSETEX (millisecond precision)
 * - Atomic increments with INCR
 * - Graceful fallback on errors
 */
class RedisStateStore implements StateStore {
    private redis: Redis;
    private isConnected: boolean = false;

    constructor(redisUrl: string) {
        // Mask credentials in logs
        const maskedUrl = redisUrl.replace(/\/\/([^:]+):([^@]+)@/, '//<credentials>@');
        console.log(`[StateStore] Connecting to Redis: ${maskedUrl}`);

        this.redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => {
                if (times > 10) {
                    console.error('[StateStore] Redis connection failed after 10 retries');
                    return null; // Stop retrying
                }
                const delay = Math.min(times * 100, 3000);
                console.log(`[StateStore] Redis retry attempt ${times}, waiting ${delay}ms`);
                return delay;
            },
            lazyConnect: false,
        });

        this.redis.on('connect', () => {
            this.isConnected = true;
            console.log('[StateStore] Redis connected successfully');
        });

        this.redis.on('error', (err: Error) => {
            console.error('[StateStore] Redis error:', err.message);
        });

        this.redis.on('close', () => {
            this.isConnected = false;
            console.log('[StateStore] Redis connection closed');
        });
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.redis.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            console.error(`[StateStore] Redis GET error for key ${key}:`, error);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            if (ttlMs && ttlMs > 0) {
                // Use PSETEX for millisecond precision TTL
                await this.redis.psetex(key, ttlMs, serialized);
            } else {
                await this.redis.set(key, serialized);
            }
        } catch (error) {
            console.error(`[StateStore] Redis SET error for key ${key}:`, error);
            throw error;
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            console.error(`[StateStore] Redis DEL error for key ${key}:`, error);
            throw error;
        }
    }

    async increment(key: string, ttlMs?: number): Promise<number> {
        try {
            const value = await this.redis.incr(key);
            // Set TTL only on first increment (when value becomes 1)
            if (ttlMs && value === 1) {
                await this.redis.pexpire(key, ttlMs);
            }
            return value;
        } catch (error) {
            console.error(`[StateStore] Redis INCR error for key ${key}:`, error);
            throw error;
        }
    }

    async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
        try {
            // Try to get existing value
            const existing = await this.get<T>(key);
            if (existing !== null) return existing;

            // Generate new value
            const value = await factory();

            // Use SET with NX (only if not exists) for race condition safety
            const serialized = JSON.stringify(value);
            let setResult: string | null;

            if (ttlMs && ttlMs > 0) {
                setResult = await this.redis.set(key, serialized, 'PX', ttlMs, 'NX');
            } else {
                setResult = await this.redis.set(key, serialized, 'NX');
            }

            // If SET NX failed, another process set it first - get their value
            if (!setResult) {
                const otherValue = await this.get<T>(key);
                if (otherValue !== null) return otherValue;
            }

            return value;
        } catch (error) {
            console.error(`[StateStore] Redis getOrSet error for key ${key}:`, error);
            // Fall back to just calling factory on error
            return factory();
        }
    }

    async disconnect(): Promise<void> {
        await this.redis.quit();
    }
}

// Singleton instance
let stateStoreInstance: StateStore | null = null;

/**
 * Get the state store instance
 * Uses Redis if REDIS_URL is set, otherwise uses in-memory
 */
export function getStateStore(): StateStore {
    if (!stateStoreInstance) {
        const redisUrl = process.env.REDIS_URL;

        if (redisUrl && redisUrl !== 'false' && redisUrl !== '') {
            console.log('[StateStore] Using Redis state store (distributed mode)');
            stateStoreInstance = new RedisStateStore(redisUrl);
        } else {
            console.log('[StateStore] Using in-memory state store (single-instance mode)');
            stateStoreInstance = new MemoryStateStore();
        }
    }

    return stateStoreInstance;
}

/**
 * Reset the state store instance (for testing)
 */
export function resetStateStore(): void {
    stateStoreInstance = null;
}

/**
 * State store key prefixes for namespacing
 */
export const STATE_KEYS = {
    RATE_LIMIT: 'rate_limit',
    TENANT_STATUS: 'tenant_status',
} as const;

/**
 * Helper to create namespaced keys
 */
export function stateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
}
