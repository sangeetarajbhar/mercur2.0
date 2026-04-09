import { useQuery } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

export type StockLocationExtension = {
  id: string;
  location_type?: number;
  stock_location?: { id: string; name: string };
};

export type Darkstore = { id: string; name: string };

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
