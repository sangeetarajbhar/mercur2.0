import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

export interface SlotDefinition {
  id: string;
  zone_id: string;
  slot_key: string;
  start_time: string;
  end_time: string;
  default_capacity: number;
  is_active: boolean;
  cut_off_time: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface SlotDefinitionsResponse {
  slot_definitions: SlotDefinition[];
  count?: number;
}

type CreateSlotInput = Partial<SlotDefinition> & {
  slot_key: string;
  start_time: string;
  end_time: string;
  default_capacity: number;
  is_active: boolean;
  cut_off_time: string;
};

type CreateBulkSlotDefinitionsInput = {
  zone_id: string;
  slots: CreateSlotInput[];
};

type BulkUpdateSlotDefinitionsInput = {
  zoneId: string;
  slots: Partial<SlotDefinition>[];
};

const SLOT_DEFINITIONS_QUERY_KEY = "admin_slot_definitions" as const;
export const slotDefinitionsQueryKeys = queryKeysFactory(
  SLOT_DEFINITIONS_QUERY_KEY
);

export const useSlotDefinitions = (zoneId: string) => {
  return useQuery<SlotDefinitionsResponse>({
    queryKey: slotDefinitionsQueryKeys.list({ zoneId }),
    queryFn: async () => {
      const response = await fetch(`/admin/zones/${zoneId}/slot-definitions`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch slot definitions");
      }

      return response.json();
    },
    enabled: !!zoneId,
  });
};

export const useCreateBulkSlotDefinitions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBulkSlotDefinitionsInput) => {
      const response = await fetch(
        `/admin/zones/${payload.zone_id}/slot-definitions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ slots: payload.slots }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to create slot definitions"
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: slotDefinitionsQueryKeys.list({ zoneId: variables.zone_id }),
      });
    },
  });
};

export const useBulkUpdateSlotDefinitions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ zoneId, slots }: BulkUpdateSlotDefinitionsInput) => {
      const response = await fetch(`/admin/zones/${zoneId}/slot-definitions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ slots }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to update slot definitions"
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: slotDefinitionsQueryKeys.list({ zoneId: variables.zoneId }),
      });
    },
  });
};
