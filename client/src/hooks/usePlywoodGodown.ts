import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PlywoodBrandMemory } from "@shared/schema";

export function usePlywoodBrands() {
  return useQuery<PlywoodBrandMemory[]>({
    queryKey: ["godown", "plywood"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/godown/plywood");
      return res.json();
    },
  });
}

export function useCreatePlywoodBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { brand: string }) => {
      const res = await apiRequest("POST", "/api/godown/plywood", payload);
      return res.json() as Promise<PlywoodBrandMemory>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["godown", "plywood"] });
    },
  });
}
