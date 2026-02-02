import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { ENV } from "@/lib/system/env";
import { useAuthStore } from "@/stores/authStore";

// API Base URL - uses environment variable, falls back to relative paths
// In production, use relative paths (empty string) so requests go to same origin
// In development, Vite proxy handles forwarding to the server
export const API_BASE = ENV.API_BASE || "";

// Helper to construct full API URLs
export function API(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Ensure path starts with /api
  const apiPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  return `${API_BASE}${apiPath}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    let json: any;
    try {
      json = await res.clone().json();
    } catch {
      return;
    }
    if (json && typeof json === "object" && "ok" in json && json.ok === false) {
      const message = typeof json.error === "string" ? json.error : "Request failed";
      throw new Error(message);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth token
  const { accessToken } = useAuthStore.getState();

  // Build URL - use API_BASE if set, otherwise just the URL
  const fullUrl = API_BASE ? `${API_BASE}${url}` : url;

  // Build headers with auth token
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey.join("/") as string;

      // Get auth token
      const { accessToken } = useAuthStore.getState();

      // Build URL - use API_BASE if set, otherwise just the URL
      const fullUrl = API_BASE ? `${API_BASE}${url}` : url;

      // Build headers with auth token
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(fullUrl, {
        credentials: "include",
        headers,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      try {
        return await res.json();
      } catch {
        throw new Error(`Invalid JSON from ${url}`);
      }
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
