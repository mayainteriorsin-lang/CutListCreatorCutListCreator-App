import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PlywoodBrandMemory } from "@shared/schema";

export function usePlywoodBrands() {
  return useQuery<PlywoodBrandMemory[]>({
    queryKey: ["godown", "plywood"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/godown/plywood");
        const json = await res.json();
        const data = json?.data ?? json;
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn("usePlywoodBrands fetch failed:", error);
        return [];
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: 2,
  });
}

export function useCreatePlywoodBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { brand: string }) => {
      const res = await apiRequest("POST", "/api/godown/plywood", payload);
      const json = await res.json();
      return (json?.data ?? json) as PlywoodBrandMemory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["godown", "plywood"] });
    },
  });
}
