import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { LaminateCodeGodown } from "@shared/schema";

// ✅ Central Godown Hook (Standardized)
export function useLaminateCodes() {
  return useQuery<LaminateCodeGodown[]>({
    queryKey: ["laminate-code-godown"], // Updated queryKey
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/laminate-code-godown");
      return res.json();
    },
  });
}

export function useCreateLaminateCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { code: string; name?: string }) => {
      const res = await apiRequest("POST", "/api/laminate-code-godown", payload);
      return res.json() as Promise<LaminateCodeGodown>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laminate-code-godown"] });
    },
  });
}
