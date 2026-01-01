import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MasterSettingsMemory } from "@shared/schema";

export function useMasterSettings() {
  return useQuery<MasterSettingsMemory>({
    queryKey: ["master-settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/master-settings");
      return res.json();
    },
  });
}

export function useUpdateMasterSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Pick<MasterSettingsMemory, "masterLaminateCode" | "sheetWidth" | "sheetHeight" | "kerf" | "optimizePlywoodUsage">>) => {
      const res = await apiRequest("POST", "/api/master-settings", payload);
      return res.json() as Promise<MasterSettingsMemory>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-settings"] });
    },
  });
}
