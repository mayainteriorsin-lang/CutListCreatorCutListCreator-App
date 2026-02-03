/**
 * PHASE 8: Request Correlation Middleware
 *
 * Adds unique requestId to every API request for:
 * - Distributed tracing
 * - Log correlation
 * - Error tracking
 * - Audit trail linkage
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Extended request type with requestId
 */
export interface RequestWithId extends Request {
  requestId: string;
}

/**
 * Request ID header name (standard)
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Generate or extract request ID
 * - Uses incoming x-request-id header if present (for distributed tracing)
 * - Otherwise generates new UUID
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers[REQUEST_ID_HEADER] as string | undefined;
  const requestId = incomingId || randomUUID();

  // Attach to request object
  (req as RequestWithId).requestId = requestId;

  // Echo back in response header
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}

/**
 * Get requestId from request (helper)
 */
export function getRequestId(req: Request): string {
  return (req as RequestWithId).requestId || 'unknown';
}
