import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { LaminateCodeGodown } from "@shared/schema";

// Central Godown Hook (Standardized)
export function useLaminateCodes() {
  return useQuery<LaminateCodeGodown[]>({
    queryKey: ["laminate-code-godown"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/laminate-code-godown");
        const json = await res.json();
        const data = json?.data ?? json;
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn("useLaminateCodes fetch failed:", error);
        return [];
      }
    },
    staleTime: 30000,
    retry: 2,
  });
}

export function useCreateLaminateCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { code: string; name: string }) => {
      const res = await apiRequest("POST", "/api/laminate-code-godown", payload);
      const json = await res.json();
      return (json?.data ?? json) as LaminateCodeGodown;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laminate-code-godown"] });
    },
    onError: (error) => {
      console.error("Failed to create laminate code:", error);
    },
  });
}
