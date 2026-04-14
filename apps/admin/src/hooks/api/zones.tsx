import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

import { CreateZoneRequest, UpdateZoneRequest, Zone } from "../../routes/zones/types";

type UseZonesParams = {
  limit?: number;
  offset?: number;
  q?: string;
};

type ZonesQueryResponse = {
  zones: Zone[];
  count?: number;
  offset?: number;
  limit?: number;
};

const ZONES_QUERY_KEY = "admin_zones" as const;
export const zonesQueryKeys = queryKeysFactory(ZONES_QUERY_KEY);

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const useZones = (params?: UseZonesParams) => {
  return useQuery<ZonesQueryResponse>({
    queryKey: zonesQueryKeys.list(params),
    queryFn: async () => {
      const response = await fetch(`/admin/zones${buildQueryString(params)}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch zones");
      }

      const data = await response.json();
      return {
        zones: data.zones || [],
        count: data.count,
        offset: data.offset,
        limit: data.limit,
      };
    },
  });
};

export const useZone = (
  id: string,
  query?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<Zone>, "queryKey" | "queryFn">
) => {
  return useQuery<Zone>({
    queryKey: zonesQueryKeys.detail(id, query),
    queryFn: async () => {
      const response = await fetch(
        `/admin/zones/${id}${buildQueryString(query)}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch zone");
      }

      const data = await response.json();
      return data.zone;
    },
    enabled: !!id,
    ...options,
  });
};

export const useCreateZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateZoneRequest) => {
      const response = await fetch("/admin/zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create zone");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zonesQueryKeys.lists() });
    },
  });
};

export const useUpdateZone = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateZoneRequest) => {
      const response = await fetch(`/admin/zones/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update zone");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zonesQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: zonesQueryKeys.detail(id) });
    },
  });
};
