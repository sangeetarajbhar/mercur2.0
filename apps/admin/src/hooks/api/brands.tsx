import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

export type Brand = {
  id: string;
  name: string;
  handle: string;
  is_active?: boolean;
};

export type UseBrandsParams = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
};

export type BrandsQueryResponse = {
  brands: Brand[];
  count?: number;
  offset?: number;
  limit?: number;
};

const BRANDS_QUERY_KEY = "admin_brands" as const;
export const brandsQueryKeys = queryKeysFactory(BRANDS_QUERY_KEY);

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

export const useBrands = (params?: UseBrandsParams) => {
  return useQuery<BrandsQueryResponse>({
    queryKey: brandsQueryKeys.list(params),
    queryFn: async () => {
      const response = await fetch(
        `/admin/brands${buildQueryString(params as Record<string, unknown>)}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch brands");
      }

      const data = await response.json();
      return {
        brands: data.brands || [],
        count: data.count,
        offset: data.offset,
        limit: data.limit,
      };
    },
  });
};

export const useBrand = (id: string) => {
  return useQuery<Brand>({
    queryKey: brandsQueryKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/admin/brands/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch brand");
      }

      const data = await response.json();
      return data.brand;
    },
    enabled: !!id,
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      handle?: string;
      is_active?: boolean;
    }) => {
      const response = await fetch("/admin/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create brand");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandsQueryKeys.lists() });
    },
  });
};

export const useUpdateBrand = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      handle?: string;
      is_active?: boolean;
    }) => {
      const response = await fetch(`/admin/brands/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update brand");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandsQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: brandsQueryKeys.detail(id) });
    },
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/brands/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete brand");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandsQueryKeys.lists() });
    },
  });
};
