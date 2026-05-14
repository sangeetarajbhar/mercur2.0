import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeysFactory } from '@mercurjs/dashboard-shared'

export const sellersQueryKeys = queryKeysFactory('sellers')

export interface Seller {
  id: string
  name: string
  email?: string
}

export function useSellers(query?: Record<string, string | number>) {
  const params = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
    })
  }
  const qs = params.toString()

  return useQuery<{ sellers: Seller[] }, Error>({
    queryKey: sellersQueryKeys.list(query),
    queryFn: async () => {
      const res = await fetch(`/admin/sellers${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch sellers')
      return res.json()
    },
  })
}

export function useCreateSeller() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/admin/sellers/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string
          type?: string
        }
        throw new Error(
          err.message ||
            [err.type, `HTTP ${res.status}`].filter(Boolean).join(" ") ||
            "Failed to create seller"
        )
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersQueryKeys.all })
    },
  })
}

export function useSeller(id: string) {
  return useQuery<{ seller: any }, Error>({
    queryKey: sellersQueryKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/admin/sellers/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch seller")
      return res.json()
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useUpdateSellerOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/admin/sellers/${id}/update`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          message?: string
          type?: string
          code?: string
        }
        const detail =
          errorData.message ||
          [errorData.type, errorData.code].filter(Boolean).join(": ") ||
          `HTTP ${res.status}`
        throw new Error(
          errorData.type === "unknown_error"
            ? `${detail} (check API terminal logs for the real stack trace)`
            : detail
        )
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: sellersQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: sellersQueryKeys.detail(vars.id) })
    },
  })
}
