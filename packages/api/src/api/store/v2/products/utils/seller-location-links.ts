import stockLocationSellerLink from "@mercurjs/core/links/stock-location-seller-link"

type QueryLike = {
  graph: (input: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{ data: any[] }>
}

export type SellerLocationLink = {
  seller_id: string
  stock_location_id: string
}

export async function fetchSellerLocationLinks(
  query: QueryLike,
  sellerId: string,
  stockLocationIds: string[],
  darkStoreLocationId: string
): Promise<SellerLocationLink[]> {
  const { data } = await query.graph(
    {
      entity: stockLocationSellerLink.entryPoint,
      fields: ["seller_id", "stock_location_id"],
      filters: {
        seller_id: sellerId,
        stock_location_id: stockLocationIds,
      },
    },
    {
      cache: {
        enable: true,
        key: "seller-stock-location:" + sellerId + darkStoreLocationId,
      },
    }
  )

  return (data || []) as SellerLocationLink[]
}
