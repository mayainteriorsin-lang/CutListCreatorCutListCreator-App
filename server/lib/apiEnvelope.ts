/**
 * PATCH 16: Strict API Contract Enforcement
 *
 * Standard API envelope for all responses.
 * Every endpoint MUST return ok() or err().
 */

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; details?: any };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function err(error: string, details?: any): ApiErr {
  return { ok: false, error, details };
}
