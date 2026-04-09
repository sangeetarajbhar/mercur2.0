import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

export interface InstantPromise {
  id: string;
  zone_id: string;
  promise_text: string;
  promise_minutes: number;
  pickup_lead_minutes: number;
  return_lead_minutes: number;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface InstantPromisesResponse {
  instant_promises: InstantPromise[];
  count?: number;
}

type CreateInstantPromiseInput = {
  zone_id: string;
  promise_text: string;
  promise_minutes: number;
  pickup_lead_minutes: number;
  return_lead_minutes: number;
  is_active: boolean;
};

type UpdateInstantPromiseInput = Omit<CreateInstantPromiseInput, "zone_id">;

const INSTANT_PROMISES_QUERY_KEY = "admin_instant_promises" as const;
export const instantPromisesQueryKeys = queryKeysFactory(
  INSTANT_PROMISES_QUERY_KEY
);

export const useInstantPromises = (zoneId: string) => {
  return useQuery<InstantPromisesResponse>({
    queryKey: instantPromisesQueryKeys.list({ zoneId }),
    queryFn: async () => {
      const response = await fetch(`/admin/zones/${zoneId}/instant-promises`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch instant promises");
      }

      return response.json();
    },
    enabled: !!zoneId,
  });
};

export const useCreateInstantPromise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInstantPromiseInput) => {
      const response = await fetch(
        `/admin/zones/${payload.zone_id}/instant-promises`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to create instant promise"
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: instantPromisesQueryKeys.list({ zoneId: variables.zone_id }),
      });
    },
  });
};

export const useUpdateInstantPromise = (zoneId: string, promiseId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateInstantPromiseInput) => {
      const response = await fetch(
        `/admin/zones/${zoneId}/instant-promises/${promiseId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to update instant promise"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: instantPromisesQueryKeys.list({ zoneId }),
      });
    },
  });
};
