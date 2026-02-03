/**
 * PHASE 3: Catalogues API Service
 *
 * Extracted from settings.tsx to enforce boundary ownership.
 * Page layer should only compose UI; API calls live here.
 */

import { API_BASE } from "@/lib/queryClient";

export interface Catalogue {
  filename: string;
  size: number;
  uploadedAt: string;
  originalName?: string;
}

/**
 * Fetch all laminate catalogues
 */
export async function fetchCatalogues(): Promise<Catalogue[]> {
  try {
    const response = await fetch(`${API_BASE}/api/laminate-catalogues`);
    const data = await response.json();
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("[CataloguesApi] Error fetching:", error);
    return [];
  }
}
