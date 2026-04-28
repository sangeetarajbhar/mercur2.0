import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

import type {
  AttributeDTO,
  AttributePossibleValueDTO,
} from "../../routes/attributes/types";

const ATTRIBUTE_QUERY_KEY = "attribute" as const;
export const attributeQueryKeys = queryKeysFactory(ATTRIBUTE_QUERY_KEY);

const ATTRIBUTE_POSSIBLE_VALUE_QUERY_KEY = "attribute-possible-value" as const;
export const attributePossibleValueQueryKeys = queryKeysFactory(
  ATTRIBUTE_POSSIBLE_VALUE_QUERY_KEY
);

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export type AttributesListResponse = {
  attributes: AttributeDTO[];
  count: number;
  offset: number;
  limit: number;
};

export const useAttributes = (query?: Record<string, unknown>) => {
  const { data, ...rest } = useQuery<AttributesListResponse>({
    queryKey: attributeQueryKeys.list(query),
    queryFn: async () => {
      const response = await fetch(
        `/admin/attributes${buildQueryString(query)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch attributes");
      }
      const data = await response.json();
      return {
        attributes: data.attributes || [],
        count: data.count ?? 0,
        offset: data.offset ?? 0,
        limit: data.limit ?? 0,
      };
    },
  });

  return { ...data, ...rest };
};

export type AttributeResponse = {
  attribute: AttributeDTO;
};

export const useAttribute = (
  id: string,
  query?: Record<string, string | number>,
  options?: { enabled?: boolean }
) => {
  const { data, ...rest } = useQuery<AttributeResponse>({
    queryKey: attributeQueryKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(
        `/admin/attributes/${id}${buildQueryString(query)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch attribute");
      }
      return response.json();
    },
    enabled: options?.enabled ?? !!id,
  });

  return { ...data, ...rest };
};

export const useCreateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch("/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create attribute");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.lists() });
    },
  });
};

export const useUpdateAttribute = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch(`/admin/attributes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update attribute");
      }
      return response.json() as Promise<{ attribute: AttributeDTO }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: attributeQueryKeys.detail(id),
      });
    },
  });
};

export const useDeleteAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/attributes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete attribute");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.lists() });
    },
  });
};

export const useUpdateAttributePossibleValue = (
  attributeId: string,
  possibleValueId: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: Partial<
        Pick<AttributePossibleValueDTO, "value" | "rank" | "metadata">
      >
    ) => {
      const response = await fetch(
        `/admin/attributes/${attributeId}/values/${possibleValueId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update possible value");
      }
      return response.json() as Promise<{
        possible_value: AttributePossibleValueDTO;
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attributeQueryKeys.detail(attributeId),
      });
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: attributePossibleValueQueryKeys.detail(possibleValueId),
      });
    },
  });
};
