import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"

declare const __BACKEND_URL__: string

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
}

const QUERY_KEY = "vendor_price_list_requests" as const
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
        `${__BACKEND_URL__}/vendor/price-list/requests${buildQueryString(params as any)}`,
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
      const res = await fetch(
        `${__BACKEND_URL__}/vendor/price-list/requests/${id}`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error("Failed to fetch price list request")
      return res.json()
    },
    enabled: !!id,
    ...options,
  })
}

export const useImportPriceList = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`${__BACKEND_URL__}/vendor/price-list/import`, {
        method: "POST",
        credentials: "include",
        body: form,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.message || "Upload failed")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceListRequestsQueryKeys.lists() })
    },
  })
}
