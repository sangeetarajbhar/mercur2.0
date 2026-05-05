import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

export type LocationHierarchyRow = {
  id: string;
  parent_location_id: string;
  child_location_id: string;
  promise_minutes?: number;
  created_at?: string;
};

export type LocationHierarchyListResponse = {
  data: LocationHierarchyRow[];
  total: number;
  offset: number;
  limit: number;
};

export type LocationHierarchyNode = {
  id: string;
  parent_location_id: string | null;
  child_location_id: string;
  children?: LocationHierarchyNode[];
};

export type LocationHierarchyTreeResponse = {
  hierarchy_tree: LocationHierarchyNode[];
};

export type CreateLocationHierarchyPayload = {
  parent_location_id: string;
  child_location_id: string;
  promise_minutes?: number;
};

export type UpdateLocationHierarchyPayload = {
  promise_minutes?: number;
};

const LOCATION_HIERARCHY_QUERY_KEY = "admin_location_hierarchy" as const;
export const locationHierarchyQueryKeys = queryKeysFactory(
  LOCATION_HIERARCHY_QUERY_KEY
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

type UseLocationHierarchiesParams = {
  limit?: number;
  offset?: number;
};

export const useLocationHierarchies = (params?: UseLocationHierarchiesParams) => {
  return useQuery<LocationHierarchyListResponse>({
    queryKey: locationHierarchyQueryKeys.list(params),
    queryFn: async () => {
      const response = await fetch(
        `/admin/location-hierarchy${buildQueryString(params)}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch location hierarchies");
      }

      const data = await response.json();
      return {
        data: data.data || [],
        total: data.total ?? (data.data?.length ?? 0),
        offset: data.offset ?? 0,
        limit: data.limit ?? (data.data?.length ?? 0),
      };
    },
  });
};

export const useCreateLocationHierarchy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateLocationHierarchyPayload) => {
      const response = await fetch("/admin/location-hierarchy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || "Failed to create location hierarchy"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: locationHierarchyQueryKeys.lists(),
      });
    },
  });
};

export const useUpdateLocationHierarchy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateLocationHierarchyPayload }) => {
      const response = await fetch(`/admin/location-hierarchy/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || "Failed to update location hierarchy"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: locationHierarchyQueryKeys.lists(),
      });
    },
  });
};

export const useDeleteLocationHierarchy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/location-hierarchy/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || "Failed to delete location hierarchy"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: locationHierarchyQueryKeys.lists(),
      });
    },
  });
};

export const fetchLocationHierarchyTree = async (
  locationId: string
): Promise<LocationHierarchyTreeResponse> => {
  const response = await fetch(
    `/admin/location-hierarchy/${locationId}/tree`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch location hierarchy tree");
  }

  return response.json();
};
