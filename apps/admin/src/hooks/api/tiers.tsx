import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

import { Tier } from "../../routes/tiers/types";

export type UseTiersParams = {
  limit?: number;
  offset?: number;
  q?: string;
  fields?: string;
};

export type TiersResponse = {
  tiers: Tier[];
  count?: number;
  offset?: number;
  limit?: number;
};

const TIERS_QUERY_KEY = "admin_tiers" as const;
export const tiersQueryKeys = queryKeysFactory(TIERS_QUERY_KEY);

export const useTiers = (params?: UseTiersParams) => {
  return useQuery<TiersResponse>({
    queryKey: tiersQueryKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      const paramEntries = Object.entries(params || {}) as Array<
        [keyof UseTiersParams, UseTiersParams[keyof UseTiersParams]]
      >;

      paramEntries.forEach(([key, value]) => {
        if (key === "fields") {
          return;
        }
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
        ) {
          return;
        }
        searchParams.set(key, String(value));
      });

      const queryString = searchParams.toString();
      const response = await fetch(
        `/admin/tiers${queryString ? `?${queryString}` : ""}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tiers");
      }

      const data = await response.json();
      return {
        tiers: data.tiers || [],
        count: data.count,
        offset: data.offset,
        limit: data.limit,
      };
    },
  });
};

export const useTier = (id: string) => {
  return useQuery<Tier>({
    queryKey: tiersQueryKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/admin/tiers/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tier");
      }

      const data = await response.json();
      return data.tier;
    },
    enabled: !!id,
  });
};

export const useCreateTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      promo_id?: string | null;
      tier_rules?: Array<{
        min_purchase_value: number;
        currency_code: string;
      }>;
    }) => {
      const response = await fetch("/admin/tiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to create tier"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tiersQueryKeys.lists() });
    },
  });
};

export const useUpdateTier = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      promo_id?: string | null;
    }) => {
      const response = await fetch(`/admin/tiers/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to update tier"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tiersQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tiersQueryKeys.detail(id) });
    },
  });
};

export const useDeleteTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/tiers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to delete tier"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tiersQueryKeys.lists() });
    },
  });
};

export type TierCustomer = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

export type TierCustomersResponse = {
  customers: TierCustomer[];
  count: number;
  offset: number;
  limit: number;
};

export type CustomerUploadEntry = {
  customer_id: string;
  action: "add" | "remove";
};

export type AssignTierCustomersResponse = {
  assigned: number;
  removed: number;
  skipped: number;
  message?: string;
};

export const useAssignTierCustomers = (tierId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customers: CustomerUploadEntry[]) => {
      const response = await fetch(`/admin/tiers/${tierId}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ customers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          errorData.error ||
          `Failed to process customers for tier (${response.status})`;
        throw new Error(errorMessage);
      }

      return response.json() as Promise<AssignTierCustomersResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...tiersQueryKeys.detail(tierId), "customers"],
      });
    },
  });
};

export const useTierCustomers = (
  tierId: string,
  params?: { limit?: number; offset?: number }
) => {
  return useQuery<TierCustomersResponse>({
    queryKey: [...tiersQueryKeys.detail(tierId), "customers", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.limit) {
        searchParams.set("limit", String(params.limit));
      }
      if (params?.offset) {
        searchParams.set("offset", String(params.offset));
      }

      const queryString = searchParams.toString();
      const response = await fetch(
        `/admin/tiers/${tierId}/customers${queryString ? `?${queryString}` : ""}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tier customers");
      }

      return response.json();
    },
    enabled: !!tierId,
  });
};
