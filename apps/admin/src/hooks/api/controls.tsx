import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

import { Control } from "../../routes/controls/types";

export type UseControlsParams = {
  limit?: number;
  offset?: number;
  scope?: "zone" | "darkstore";
  q?: string;
};

export type ControlsQueryResponse = {
  controls: Control[];
  count?: number;
  offset?: number;
  limit?: number;
};

const CONTROLS_QUERY_KEY = "admin_controls" as const;
export const controlsQueryKeys = queryKeysFactory(CONTROLS_QUERY_KEY);

const buildQueryString = (params?: UseControlsParams) => {
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

export const useControls = (params?: UseControlsParams) => {
  return useQuery<ControlsQueryResponse>({
    queryKey: controlsQueryKeys.list(params),
    queryFn: async () => {
      const response = await fetch(`/admin/controls${buildQueryString(params)}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch controls");
      }

      const data = await response.json();

      return {
        controls: data.controls || [],
        count: data.count,
        offset: data.offset,
        limit: data.limit,
      };
    },
  });
};

export const useControl = (id: string) => {
  return useQuery<Control>({
    queryKey: controlsQueryKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/admin/controls/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch control");
      }

      const data = await response.json();
      return data.control;
    },
    enabled: !!id,
  });
};

export const useCreateControl = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (controlData: unknown) => {
      const response = await fetch("/admin/controls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(controlData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create control");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: controlsQueryKeys.lists() });
    },
  });
};

export const useUpdateControl = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const response = await fetch(`/admin/controls/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update control");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: controlsQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: controlsQueryKeys.detail(id) });
    },
  });
};
