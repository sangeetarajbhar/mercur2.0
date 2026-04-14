import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

export interface SlotOverride {
  id: string;
  zone_id: string;
  slot_date: string;
  slot_key?: string;
  start_time: string;
  end_time: string;
  cut_off_time: string | null;
  total_capacity: number;
  remaining_capacity: number;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SlotOverridesResponse {
  slot_overrides: SlotOverride[];
  count?: number;
}

type SlotOverridesQuery = {
  slot_date?: string | string[];
  is_active?: boolean;
};

type CreateSlotOverrideInput = {
  zoneId: string;
  data: Omit<SlotOverride, "id" | "zone_id" | "created_at" | "updated_at">;
};

type UpdateSlotOverrideInput = {
  zoneId: string;
  overrideId: string;
  data: Partial<Omit<SlotOverride, "id" | "zone_id" | "created_at" | "updated_at">>;
};

const SLOT_OVERRIDES_QUERY_KEY = "admin_slot_overrides" as const;
export const slotOverridesQueryKeys = queryKeysFactory(SLOT_OVERRIDES_QUERY_KEY);

const buildQueryString = (query?: SlotOverridesQuery) => {
  const params = new URLSearchParams();

  if (query?.slot_date) {
    if (Array.isArray(query.slot_date)) {
      params.append("slot_date", query.slot_date.join(","));
    } else {
      params.append("slot_date", query.slot_date);
    }
  }

  if (query?.is_active !== undefined) {
    params.append("is_active", String(query.is_active));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const invalidateSlotOverridesForZone = (
  queryClient: ReturnType<typeof useQueryClient>,
  zoneId: string
) => {
  queryClient.invalidateQueries({
    queryKey: slotOverridesQueryKeys.list({ zoneId }),
    exact: false,
  });
};

export const useSlotOverrides = (zoneId: string, query?: SlotOverridesQuery) => {
  return useQuery<SlotOverridesResponse>({
    queryKey: slotOverridesQueryKeys.list({ zoneId, ...query }),
    queryFn: async () => {
      const response = await fetch(
        `/admin/zones/${zoneId}/slot-overrides${buildQueryString(query)}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch slot overrides");
      }

      return response.json();
    },
    enabled: !!zoneId,
  });
};

export const useCreateSlotOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ zoneId, data }: CreateSlotOverrideInput) => {
      const response = await fetch(`/admin/zones/${zoneId}/slot-overrides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to create slot override"
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      invalidateSlotOverridesForZone(queryClient, variables.zoneId);
    },
  });
};

export const useUpdateSlotOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ zoneId, overrideId, data }: UpdateSlotOverrideInput) => {
      const response = await fetch(
        `/admin/zones/${zoneId}/slot-overrides/${overrideId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to update slot override"
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      invalidateSlotOverridesForZone(queryClient, variables.zoneId);
    },
  });
};
