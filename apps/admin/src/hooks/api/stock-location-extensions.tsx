import { useQuery } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

export type StockLocationExtension = {
  id: string;
  location_type?: number | string;
  stock_location?: { id: string; name: string };
};

export type Darkstore = { id: string; name: string };

export type EnrichedLocationExtension = {
  id: string;
  name: string;
  location_type: string;
  extension_id: string;
};

const STOCK_LOCATION_EXTENSIONS_QUERY_KEY = "admin_stock_location_extensions" as const;
export const stockLocationExtensionsQueryKeys = queryKeysFactory(
  STOCK_LOCATION_EXTENSIONS_QUERY_KEY
);

export const useDarkstoresFromExtensions = () => {
  return useQuery<{ darkstores: Darkstore[] }>({
    queryKey: stockLocationExtensionsQueryKeys.list({ location_type: 1 }),
    queryFn: async () => {
      const response = await fetch(`/admin/stock-location-extension?location_type=1`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stock location extensions");
      }

      const data = await response.json();
      const list: StockLocationExtension[] = data.stock_location_extensions || [];
      const darkstores = list
        .map((ext) => ({
          id: ext.stock_location?.id as string,
          name: ext.stock_location?.name as string,
        }))
        .filter((d): d is Darkstore => Boolean(d.id && d.name));

      return { darkstores };
    },
  });
};

const OMNI_PAGE_SIZE = 10;

export type UseOmniLocationsOptions = {
  search?: string;
  limit?: number;
  offset?: number;
};

export const useOmniLocationsFromExtensions = (
  options: UseOmniLocationsOptions = {}
) => {
  const { search = "", limit = OMNI_PAGE_SIZE, offset = 0 } = options;

  return useQuery<{ locations: Darkstore[]; total: number }>({
    queryKey: stockLocationExtensionsQueryKeys.list({
      location_type: 2,
      q: search,
      limit,
      offset,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        location_type: "2",
        limit: String(limit),
        offset: String(offset),
      });
      if (search.trim()) {
        params.set("q", search.trim());
      }

      const response = await fetch(
        `/admin/stock-location-extension?${params.toString()}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stock location extensions");
      }

      const data = await response.json();
      const list: StockLocationExtension[] = data.stock_location_extensions || [];
      const locations = list
        .map((ext) => ({
          id: ext.stock_location?.id as string,
          name: ext.stock_location?.name as string,
        }))
        .filter((d): d is Darkstore => Boolean(d.id && d.name));

      const total = typeof data.count === "number" ? data.count : locations.length;
      return { locations, total };
    },
  });
};

/**
 * One-shot fetch of all extensions for a given location_type, used to build
 * a client-side lookup map from stock_location.id to enriched metadata.
 * Used by the location-hierarchy page to enrich flat hierarchy rows.
 */
export const useAllLocationExtensions = (locationType: number | string) => {
  return useQuery<{ map: Record<string, EnrichedLocationExtension> }>({
    queryKey: stockLocationExtensionsQueryKeys.list({
      location_type: locationType,
      all: true,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        location_type: String(locationType),
        limit: "1000",
        offset: "0",
      });

      const response = await fetch(
        `/admin/stock-location-extension?${params.toString()}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stock location extensions");
      }

      const data = await response.json();
      const list: StockLocationExtension[] = data.stock_location_extensions || [];

      const map: Record<string, EnrichedLocationExtension> = {};
      for (const ext of list) {
        const loc = ext.stock_location;
        if (!loc?.id) continue;
        map[loc.id] = {
          id: loc.id,
          name: loc.name,
          location_type: String(ext.location_type ?? ""),
          extension_id: ext.id,
        };
      }
      return { map };
    },
  });
};
