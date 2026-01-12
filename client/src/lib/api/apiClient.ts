/**
 * PATCH 43: Centralized API Client
 * PATCH 44: Added retry with exponential backoff
 * PATCH 45: Added request timeout (8s default)
 * PATCH 48: Performance monitoring
 * PATCH 49: Production build hardening
 *
 * Single entry point for all API calls with:
 * - Consistent error handling
 * - Built-in Zod validation support
 * - Automatic toast on errors
 * - Auto-retry for transient failures
 * - Request timeout to fail fast on hanging requests
 * - Performance tracking for slow requests
 * - Centralized API base path from env
 */

import { ZodSchema } from "zod";
import { toastError } from "@/lib/errors/toastError";
import { withRetry } from "@/lib/api/retry";
import { withTimeout } from "@/lib/api/withTimeout";
import { perfStart, perfEnd } from "@/lib/perf";
import { ENV } from "@/lib/system/env";
import { logger } from "@/lib/system/logger";

export async function apiGet<T>(
  url: string,
  schema?: ZodSchema<T>
): Promise<T | null> {
  const fullUrl = `${ENV.API_BASE}${url}`;
  const perfKey = `api:GET:${url}`;
  perfStart(perfKey);

  try {
    const result = await withRetry(async () => {
      const res = await withTimeout(
        fetch(fullUrl, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        })
      );

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

export async function apiPost<T>(
  url: string,
  body: any,
  schema?: ZodSchema<T>
): Promise<T | null> {
  const fullUrl = `${ENV.API_BASE}${url}`;
  const perfKey = `api:POST:${url}`;
  perfStart(perfKey);

  try {
    const result = await withRetry(async () => {
      const res = await withTimeout(
        fetch(fullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      );

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

export async function apiDelete<T>(
  url: string,
  schema?: ZodSchema<T>
): Promise<T | null> {
  const fullUrl = `${ENV.API_BASE}${url}`;
  const perfKey = `api:DELETE:${url}`;
  perfStart(perfKey);

  try {
    const result = await withRetry(async () => {
      const res = await withTimeout(
        fetch(fullUrl, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        })
      );

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
