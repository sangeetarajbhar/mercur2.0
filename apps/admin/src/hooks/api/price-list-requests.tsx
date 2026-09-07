import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"

export type PriceListRequest = {
  id: string
  type: string
  data: Record<string, any>
  submitter_id: string
  seller_id: string
  file_name: string
  transaction_id: string | null
  reviewer_id: string | null
  reviewer_note: string | null
  status: "draft" | "pending" | "accepted" | "rejected"
  created_at: string
  updated_at: string
}

type ListResponse = {
  price_list_requests: PriceListRequest[]
  count: number
  offset: number
  limit: number
}

type UseListParams = {
  limit?: number
  offset?: number
  status?: string
  seller_id?: string
}

const QUERY_KEY = "admin_price_list_requests" as const
export const priceListRequestsQueryKeys = queryKeysFactory(QUERY_KEY)

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return ""
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
  })
  const qs = sp.toString()
  return qs ? `?${qs}` : ""
}

export const usePriceListRequests = (
  params?: UseListParams,
  options?: Omit<UseQueryOptions<ListResponse>, "queryKey" | "queryFn">
) => {
  return useQuery<ListResponse>({
    queryKey: priceListRequestsQueryKeys.list(params),
    queryFn: async () => {
      const res = await fetch(
        `/admin/price-list-requests${buildQueryString(params as any)}`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error("Failed to fetch price list requests")
      return res.json()
    },
    ...options,
  })
}

export const usePriceListRequest = (
  id: string,
  options?: Omit<UseQueryOptions<{ price_list_request: PriceListRequest }>, "queryKey" | "queryFn">
) => {
  return useQuery<{ price_list_request: PriceListRequest }>({
    queryKey: priceListRequestsQueryKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/admin/price-list-requests/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch price list request")
      return res.json()
    },
    enabled: !!id,
    ...options,
  })
}

export const useReviewPriceListRequest = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      status: "accepted" | "rejected"
      reviewer_note: string
    }) => {
      const res = await fetch(`/admin/price-list-requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.message || "Failed to review request")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: priceListRequestsQueryKeys.detail(id),
      })
      queryClient.invalidateQueries({
        queryKey: priceListRequestsQueryKeys.lists(),
      })
    },
  })
}
