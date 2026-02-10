/**
 * PHASE 16: Circuit Breaker Service
 *
 * Provides resilience patterns for external service calls:
 * - Circuit Breaker: Prevents cascading failures
 * - Retry: Automatic retry with exponential backoff
 * - Timeout: Request timeout handling
 * - Bulkhead: Concurrent request limiting
 *
 * Usage:
 *   const breaker = getCircuitBreaker('openai');
 *   const result = await breaker.execute(() => callOpenAI(params));
 */

import {
    CircuitBreakerPolicy,
    ConsecutiveBreaker,
    ExponentialBackoff,
    handleAll,
    retry,
    circuitBreaker,
    timeout,
    wrap,
    TimeoutStrategy,
    IPolicy,
} from 'cockatiel';

/**
 * Circuit breaker configuration per service
 */
interface BreakerConfig {
    /** Name for logging */
    name: string;
    /** Number of consecutive failures before opening circuit */
    consecutiveFailures: number;
    /** Time circuit stays open before trying again (ms) */
    halfOpenAfter: number;
    /** Request timeout (ms) */
    timeoutMs: number;
    /** Maximum retry attempts */
    maxRetries: number;
    /** Initial retry delay (ms) */
    initialRetryDelay: number;
    /** Maximum retry delay (ms) */
    maxRetryDelay: number;
}

/**
 * Default configurations for different service types
 */
const DEFAULT_CONFIGS: Record<string, BreakerConfig> = {
    // OpenAI / AI services - longer timeouts, fewer retries
    ai: {
        name: 'ai',
        consecutiveFailures: 5,
        halfOpenAfter: 30000, // 30 seconds
        timeoutMs: 60000,     // 60 seconds (AI can be slow)
        maxRetries: 2,
        initialRetryDelay: 1000,
        maxRetryDelay: 10000,
    },
    // Database - shorter timeouts, more retries
    database: {
        name: 'database',
        consecutiveFailures: 3,
        halfOpenAfter: 10000, // 10 seconds
        timeoutMs: 5000,      // 5 seconds
        maxRetries: 3,
        initialRetryDelay: 100,
        maxRetryDelay: 2000,
    },
    // External APIs - balanced
    external: {
        name: 'external',
        consecutiveFailures: 5,
        halfOpenAfter: 20000, // 20 seconds
        timeoutMs: 30000,     // 30 seconds
        maxRetries: 3,
        initialRetryDelay: 500,
        maxRetryDelay: 5000,
    },
    // Default fallback
    default: {
        name: 'default',
        consecutiveFailures: 5,
        halfOpenAfter: 15000,
        timeoutMs: 30000,
        maxRetries: 2,
        initialRetryDelay: 500,
        maxRetryDelay: 5000,
    },
};

/**
 * Circuit breaker state tracking
 */
interface BreakerState {
    policy: IPolicy;
    config: BreakerConfig;
    stats: {
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        circuitOpenCount: number;
        lastFailure?: Date;
        lastSuccess?: Date;
    };
}

// Store circuit breakers by name
const breakers = new Map<string, BreakerState>();

/**
 * Create a circuit breaker policy with the given configuration
 */
function createBreakerPolicy(config: BreakerConfig): IPolicy {
    // Retry policy with exponential backoff
    const retryPolicy = retry(handleAll, {
        maxAttempts: config.maxRetries,
        backoff: new ExponentialBackoff({
            initialDelay: config.initialRetryDelay,
            maxDelay: config.maxRetryDelay,
        }),
    });

    // Circuit breaker policy
    const circuitBreakerPolicy = circuitBreaker(handleAll, {
        halfOpenAfter: config.halfOpenAfter,
        breaker: new ConsecutiveBreaker(config.consecutiveFailures),
    });

    // Timeout policy
    const timeoutPolicy = timeout(config.timeoutMs, TimeoutStrategy.Aggressive);

    // Wrap policies: timeout -> retry -> circuit breaker
    // Order matters: innermost policy executes first
    return wrap(timeoutPolicy, retryPolicy, circuitBreakerPolicy);
}

/**
 * Get or create a circuit breaker for the specified service
 */
export function getCircuitBreaker(serviceName: string): BreakerState {
    const existing = breakers.get(serviceName);
    if (existing) return existing;

    // Get config for this service type or use default
    const configKey = Object.keys(DEFAULT_CONFIGS).includes(serviceName)
        ? serviceName
        : 'default';

    const baseConfig = DEFAULT_CONFIGS[configKey] || DEFAULT_CONFIGS['default'];
    // Ensure we have a valid config object before spreading
    if (!baseConfig) {
        throw new Error(`Configuration for ${configKey} not found and default is missing`);
    }

    const config = { ...baseConfig, name: serviceName };

    const policy = createBreakerPolicy(config);

    const state: BreakerState = {
        policy,
        config,
        stats: {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            circuitOpenCount: 0,
        },
    };

    // Set up event listeners for monitoring
    policy.onSuccess(() => {
        state.stats.totalCalls++;
        state.stats.successfulCalls++;
        state.stats.lastSuccess = new Date();
    });

    policy.onFailure((reason: any) => {
        state.stats.totalCalls++;
        state.stats.failedCalls++;
        state.stats.lastFailure = new Date();
        console.warn(`[CircuitBreaker:${serviceName}] Call failed:`, reason.reason);
    });

    breakers.set(serviceName, state);
    console.log(`[CircuitBreaker] Created breaker for service: ${serviceName}`);

    return state;
}

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
    serviceName: string,
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
): Promise<T> {
    const breaker = getCircuitBreaker(serviceName);

    try {
        return await breaker.policy.execute(fn);
    } catch (error: any) {
        // Log circuit breaker specific errors
        if (error.name === 'BrokenCircuitError') {
            breaker.stats.circuitOpenCount++;
            console.error(`[CircuitBreaker:${serviceName}] Circuit is OPEN - requests blocked`);
        } else if (error.name === 'TaskCancelledError') {
            console.error(`[CircuitBreaker:${serviceName}] Request timed out`);
        }

        // Use fallback if provided
        if (fallback) {
            console.log(`[CircuitBreaker:${serviceName}] Using fallback`);
            return fallback();
        }

        throw error;
    }
}

/**
 * Get circuit breaker statistics for monitoring
 */
export function getCircuitBreakerStats(): Record<string, BreakerState['stats'] & { name: string }> {
    const stats: Record<string, BreakerState['stats'] & { name: string }> = {};

    for (const [name, state] of breakers.entries()) {
        stats[name] = {
            name,
            ...state.stats,
        };
    }

    return stats;
}

/**
 * Reset a circuit breaker (for testing or manual recovery)
 */
export function resetCircuitBreaker(serviceName: string): void {
    breakers.delete(serviceName);
    console.log(`[CircuitBreaker] Reset breaker for service: ${serviceName}`);
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
    breakers.clear();
    console.log('[CircuitBreaker] All breakers reset');
}
