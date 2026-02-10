import Redis from 'ioredis';

/**
 * Cache Service
 * 
 * Provides a unified interface for caching with Redis.
 * Automatically falls back to in-memory map if Redis is not available.
 */

type CacheValue = string | number | boolean | object;

class CacheService {
    private redis: Redis | null = null;
    private memoryCache: Map<string, { value: any; expiry: number }> = new Map();
    private isRedisConnected = false;
    private useMemoryFallback = true;

    constructor() {
        this.initRedis();
    }

    private initRedis() {
        const redisUrl = process.env.REDIS_URL;

        if (redisUrl) {
            try {
                this.redis = new Redis(redisUrl, {
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times) => {
                        if (times > 3) {
                            console.warn('[Cache] Redis connection failed, switching to memory mode');
                            return null; // Stop retrying
                        }
                        return Math.min(times * 50, 2000);
                    },
                });

                this.redis.on('connect', () => {
                    console.log('[Cache] Redis connected');
                    this.isRedisConnected = true;
                });

                this.redis.on('error', (err) => {
                    // Suppress errors during connection attempts to avoid log spam
                    if (this.isRedisConnected) {
                        console.error('[Cache] Redis error:', err);
                    }
                    this.isRedisConnected = false;
                });
            } catch (e) {
                console.warn('[Cache] Failed to initialize Redis client', e);
            }
        } else {
            console.log('[Cache] No REDIS_URL found, using in-memory fallback');
        }
    }

    /**
     * Set a value in cache
     * @param key Cache key
     * @param value Value to store (will be JSON stringified)
     * @param ttlSeconds Time to live in seconds (default: 5 minutes)
     */
    async set(key: string, value: CacheValue, ttlSeconds = 300): Promise<void> {
        try {
            const stringValue = JSON.stringify(value);

            if (this.isRedisConnected && this.redis) {
                await this.redis.setex(key, ttlSeconds, stringValue);
                return;
            }
        } catch (e) {
            console.warn('[Cache] Redis set failed, falling back to memory', e);
        }

        if (this.useMemoryFallback) {
            this.memoryCache.set(key, {
                value: value,
                expiry: Date.now() + ttlSeconds * 1000,
            });
        }
    }

    /**
     * Get a value from cache
     * @param key Cache key
     * @returns Parsed value or null if not found/expired
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            if (this.isRedisConnected && this.redis) {
                const data = await this.redis.get(key);
                if (data) {
                    return JSON.parse(data) as T;
                }
                return null;
            }
        } catch (e) {
            console.warn('[Cache] Redis get failed, falling back to memory', e);
        }

        if (this.useMemoryFallback) {
            const item = this.memoryCache.get(key);
            if (!item) return null;

            if (Date.now() > item.expiry) {
                this.memoryCache.delete(key);
                return null;
            }

            return item.value as T;
        }

        return null;
    }

    /**
     * Delete a value from cache
     */
    async del(key: string): Promise<void> {
        try {
            if (this.isRedisConnected && this.redis) {
                await this.redis.del(key);
            }
        } catch (e) {
            // Ignore
        }

        if (this.useMemoryFallback) {
            this.memoryCache.delete(key);
        }
    }

    /**
     * Clear entire cache (Use with caution)
     */
    async flush(): Promise<void> {
        if (this.isRedisConnected && this.redis) {
            await this.redis.flushdb();
        }
        this.memoryCache.clear();
    }

    /**
     * Get health status
     */
    getStatus() {
        return {
            redis: this.isRedisConnected ? 'connected' : 'disconnected',
            mode: this.isRedisConnected ? 'redis' : 'memory',
            memoryItems: this.memoryCache.size,
        };
    }
}

export const cacheService = new CacheService();
export const CACHE_KEYS = {
    MASTER_SETTINGS: 'master_settings:v1',
    MASTER_SETTINGS_MEMORY: 'master_settings_memory:v1',
    GODOWN_LAMINATE: 'godown:laminate:v1',
    GODOWN_PLYWOOD: 'godown:plywood:v1',
    WOOD_GRAINS: 'wood_grains:v1',
};
