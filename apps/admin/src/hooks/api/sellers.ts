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
      const res = await fetch('/admin/sellers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create seller')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellersQueryKeys.all })
    },
  })
}
