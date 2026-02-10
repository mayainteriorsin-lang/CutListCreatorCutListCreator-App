import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MasterSettingsMemory } from "@shared/schema";

const defaultMasterSettings: MasterSettingsMemory = {
  id: 0,
  tenantId: 'default',
  sheetWidth: '1210',
  sheetHeight: '2420',
  kerf: '5',
  masterLaminateCode: null,
  masterPlywoodBrand: 'Apple Ply 16mm BWP',
  optimizePlywoodUsage: 'true',
  updatedAt: new Date()
};

export function useMasterSettings() {
  return useQuery<MasterSettingsMemory>({
    queryKey: ["master-settings"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/master-settings");
        const json = await res.json();
        const data = json?.data ?? json;
        // Merge with defaults to ensure all fields exist
        return { ...defaultMasterSettings, ...data };
      } catch (error) {
        console.warn("useMasterSettings fetch failed:", error);
        return defaultMasterSettings;
      }
    },
    staleTime: 30000,
    retry: 2,
  });
}

export function useUpdateMasterSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Pick<MasterSettingsMemory, "masterLaminateCode" | "sheetWidth" | "sheetHeight" | "kerf" | "optimizePlywoodUsage">>) => {
      const res = await apiRequest("POST", "/api/master-settings", payload);
      const json = await res.json();
      return (json?.data ?? json) as MasterSettingsMemory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-settings"] });
    },
  });
}
