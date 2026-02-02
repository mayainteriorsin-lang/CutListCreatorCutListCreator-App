/**
 * Logging Service for Visual Quotation Module
 * 
 * Provides structured logging with different severity levels and contexts.
 * Can be extended to send logs to external monitoring services.
 * 
 * Features:
 * - Structured log entries with context
 * - Different severity levels (debug, info, warn, error)
 * - Performance tracking
 * - Error context capture
 * - Production-safe (no PII logging)
 */

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

export interface LogContext {
    userId?: string;
    quotationId?: string;
    quoteNo?: string;
    operation?: string;
    duration?: number;
    [key: string]: unknown;
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

// Minimal type definition for Sentry on window
interface SentryWindow extends Window {
    Sentry?: {
        init: (options: { dsn: string; environment: string; tracesSampleRate: number }) => void;
        captureException: (error: unknown, context?: unknown) => void;
        captureMessage: (message: string, context?: unknown) => void;
    };
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';
    private logHistory: LogEntry[] = [];
    private maxHistorySize = 100; // Keep last 100 logs in memory

    /**
     * Log a debug message (development only)
     */
    debug(message: string, context?: LogContext): void {
        if (this.isDevelopment) {
            this.log(LogLevel.DEBUG, message, context);
        }
    }

    /**
     * Log an informational message
     */
    info(message: string, context?: LogContext): void {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * Log a warning message
     */
    warn(message: string, context?: LogContext): void {
        this.log(LogLevel.WARN, message, context);
    }

    /**
     * Log an error message with optional error object
     */
    error(message: string, error?: Error, context?: LogContext): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.ERROR,
            message,
            context,
        };

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: this.isDevelopment ? error.stack : undefined,
            };
        }

        this.writeLog(entry);
    }

    /**
     * Track performance of an operation
     */
    async trackPerformance<T>(
        operationName: string,
        operation: () => Promise<T>,
        context?: LogContext
    ): Promise<T> {
        const startTime = performance.now();

        try {
            const result = await operation();
            const duration = performance.now() - startTime;

            this.info(`${operationName} completed`, {
                ...context,
                operation: operationName,
                duration: Math.round(duration),
            });

            return result;
        } catch (error) {
            const duration = performance.now() - startTime;

            this.error(
                `${operationName} failed`,
                error instanceof Error ? error : new Error(String(error)),
                {
                    ...context,
                    operation: operationName,
                    duration: Math.round(duration),
                }
            );

            throw error;
        }
    }

    /**
     * Get recent log history (for debugging)
     */
    getHistory(): LogEntry[] {
        return [...this.logHistory];
    }

    /**
     * Clear log history
     */
    clearHistory(): void {
        this.logHistory = [];
    }

    /**
     * Internal logging method
     */
    private log(level: LogLevel, message: string, context?: LogContext): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
        };

        this.writeLog(entry);
    }

    /**
     * Write log entry to console and history
     */
    private writeLog(entry: LogEntry): void {
        // Add to history
        this.logHistory.push(entry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift(); // Remove oldest entry
        }

        // Console output
        const consoleMethod = this.getConsoleMethod(entry.level);
        const prefix = `[Quotation] [${entry.level.toUpperCase()}]`;

        if (entry.error) {
            consoleMethod(
                prefix,
                entry.message,
                '\nContext:',
                entry.context,
                '\nError:',
                entry.error
            );
        } else if (entry.context) {
            consoleMethod(prefix, entry.message, entry.context);
        } else {
            consoleMethod(prefix, entry.message);
        }

        // Send to external monitoring service (e.g., Sentry) if initialized
        if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
            this.sendToMonitoring(entry);
        }
    }

    /**
     * Get appropriate console method for log level
     */
    private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
        switch (level) {
            case LogLevel.DEBUG:
                return console.debug;
            case LogLevel.INFO:
                return console.info;
            case LogLevel.WARN:
                return console.warn;
            case LogLevel.ERROR:
                return console.error;
            default:
                return console.log;
        }
    }

    /**
     * Initialize Sentry safely
     */
    initSentry(dsn: string, env: string = 'production') {
        try {
            const win = window as unknown as SentryWindow;
            if (win.Sentry) {
                win.Sentry.init({
                    dsn,
                    environment: env,
                    tracesSampleRate: 1.0,
                });
                this.info('Sentry initialized', { context: 'logger' });
            } else {
                this.warn('Sentry not found on window object', { context: 'logger' });
            }
        } catch (error) {
            this.error('Failed to initialize Sentry', error as Error, { context: 'logger' });
        }
    }

    /**
     * Send critical logs to monitoring service
     */
    private sendToMonitoring(entry: LogEntry): void {
        const win = window as unknown as SentryWindow;
        if (win.Sentry) {
            try {
                if (entry.level === LogLevel.ERROR && entry.error) {
                    win.Sentry.captureException(entry.error, {
                        extra: entry.context,
                        level: entry.level,
                    });
                } else {
                    win.Sentry.captureMessage(entry.message, {
                        extra: entry.context,
                        level: entry.level,
                    });
                }
            } catch (e) {
                console.error('Failed to send to Sentry', e);
            }
        }
    }
}

// Singleton instance export
export const logger = new Logger();

/**
 * Utility: Create error with context
 */
export function createContextualError(
    message: string,
    context?: LogContext
): Error {
    const error = new Error(message);
    (error as any).context = context;
    return error;
}
