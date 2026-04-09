import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

type StockLocation = {
  id: string;
  name: string;
  [key: string]: unknown;
};

type StockLocationsQueryResponse = {
  stock_locations: StockLocation[];
  count?: number;
  offset?: number;
  limit?: number;
};

type StockLocationQueryResponse = {
  stock_location: StockLocation | null;
};

const STOCK_LOCATIONS_QUERY_KEY = "admin_stock_locations" as const;
export const stockLocationsQueryKeys = queryKeysFactory(STOCK_LOCATIONS_QUERY_KEY);

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

export const useStockLocations = (query?: Record<string, unknown>) => {
  const result = useQuery<StockLocationsQueryResponse>({
    queryKey: stockLocationsQueryKeys.list(query),
    queryFn: async () => {
      const response = await fetch(
        `/admin/stock-locations${buildQueryString(query)}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stock locations");
      }

      const data = await response.json();
      return {
        stock_locations: data.stock_locations || [],
        count: data.count,
        offset: data.offset,
        limit: data.limit,
      };
    },
  });

  return {
    ...result,
    stock_locations: result.data?.stock_locations || [],
    count: result.data?.count,
    offset: result.data?.offset,
    limit: result.data?.limit,
  };
};

export const useStockLocation = (
  id: string,
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<StockLocationQueryResponse>,
    "queryKey" | "queryFn"
  >
) => {
  const result = useQuery<StockLocationQueryResponse>({
    queryKey: stockLocationsQueryKeys.detail(id, query),
    queryFn: async () => {
      const response = await fetch(
        `/admin/stock-locations/${id}${buildQueryString(query)}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stock location");
      }

      const data = await response.json();
      return {
        stock_location: data.stock_location || null,
      };
    },
    enabled: !!id,
    ...options,
  });

  return {
    ...result,
    stock_location: result.data?.stock_location || null,
  };
};
