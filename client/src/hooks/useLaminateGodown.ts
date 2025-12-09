import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { LaminateCodeGodown } from "@shared/schema";

export function useLaminateCodes() {
  return useQuery<LaminateCodeGodown[]>({
    queryKey: ["godown", "laminate"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/godown/laminate");
      return res.json();
    },
  });
}

export function useCreateLaminateCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { code: string; name?: string }) => {
      const res = await apiRequest("POST", "/api/godown/laminate", payload);
      return res.json() as Promise<LaminateCodeGodown>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["godown", "laminate"] });
    },
  });
}
