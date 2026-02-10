/**
 * Structured Logger Service
 * 
 * Provides consistent logging across the application with:
 * - Log levels (error, warn, info, debug)
 * - Structured JSON output
 * - Request ID tracking
 * - Tenant ID context
 * - Environment-aware formatting
 */

import winston from 'winston';

// Log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

// Colors for console output
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
};

winston.addColors(colors);

// Custom format for structured logging
const structuredFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Human-readable format for development
const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Determine format based on environment
const logFormat = process.env.NODE_ENV === 'production' ? structuredFormat : devFormat;

// Create logger instance
const logger = winston.createLogger({
    levels,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: logFormat,
    transports: [
        // Console transport
        new winston.transports.Console({
            stderrLevels: ['error'],
        }),
    ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    logger.add(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        })
    );
    logger.add(
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        })
    );
}

/**
 * Create a child logger with context
 */
export function createLogger(context: Record<string, any>) {
    return logger.child(context);
}

/**
 * Log with request context
 */
export function logWithRequest(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    meta?: Record<string, any>,
    req?: { id?: string; user?: { tenantId?: string; userId?: string } }
) {
    const context: Record<string, any> = { ...meta };

    if (req) {
        if (req.id) context.requestId = req.id;
        if (req.user?.tenantId) context.tenantId = req.user.tenantId;
        if (req.user?.userId) context.userId = req.user.userId;
    }

    logger[level](message, context);
}

/**
 * Convenience methods
 */
export const log = {
    error: (message: string, meta?: Record<string, any>) => logger.error(message, meta),
    warn: (message: string, meta?: Record<string, any>) => logger.warn(message, meta),
    info: (message: string, meta?: Record<string, any>) => logger.info(message, meta),
    debug: (message: string, meta?: Record<string, any>) => logger.debug(message, meta),
};

export default logger;
