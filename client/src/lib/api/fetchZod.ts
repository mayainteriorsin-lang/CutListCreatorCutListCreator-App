/**
 * PATCH 16: Strict API Contract Enforcement
 *
 * One safe fetch wrapper that validates API responses with Zod.
 * Ensures frontend never crashes on malformed API responses.
 */

import { z, ZodTypeAny } from "zod";

// Standard API envelope schema
const ApiEnvelopeSchema = z.object({
  ok: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  details: z.any().optional(),
});

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly status?: number,
    public readonly details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch with Zod validation.
 * Returns validated data or throws ApiError.
 */
export async function fetchZod<TSchema extends ZodTypeAny>(
  url: string,
  schema: TSchema,
  init?: RequestInit
): Promise<z.infer<TSchema>> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  const text = await res.text();

  // If backend died and returned HTML or empty response, stop cleanly
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(`API returned non-JSON: ${url}`, url, res.status);
  }

  const envelope = ApiEnvelopeSchema.safeParse(json);
  if (!envelope.success) {
    throw new ApiError(`API invalid envelope: ${url}`, url, res.status);
  }

  if (!envelope.data.ok) {
    const msg = envelope.data.error || `API error: ${url}`;
    throw new ApiError(msg, url, res.status, envelope.data.details);
  }

  const parsed = schema.safeParse(envelope.data.data);
  if (!parsed.success) {
    console.error("[fetchZod] Validation failed:", url, parsed.error.message);
    throw new ApiError(`API data validation failed: ${url}`, url, res.status, parsed.error);
  }

  return parsed.data;
}

/**
 * Safe fetch with Zod validation - returns fallback on error instead of throwing.
 * Use this when you want graceful degradation.
 */
export async function safeFetchZod<TSchema extends ZodTypeAny>(
  url: string,
  schema: TSchema,
  fallback: z.infer<TSchema>,
  init?: RequestInit
): Promise<z.infer<TSchema>> {
  try {
    return await fetchZod(url, schema, init);
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn(`[safeFetchZod] ${error.message}`, error.details);
    } else {
      console.warn(`[safeFetchZod] Fetch failed: ${url}`, error);
    }
    return fallback;
  }
}

export default fetchZod;
