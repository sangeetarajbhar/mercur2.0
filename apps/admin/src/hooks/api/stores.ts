import { useQuery } from '@tanstack/react-query'
import { queryKeysFactory } from '@mercurjs/dashboard-shared'

export const storesQueryKeys = queryKeysFactory('stores')

export interface AdminStore {
  id: string
  name: string
  supported_currencies: { currency_code: string }[]
  default_sales_channel_id: string
  default_region_id: string
  default_location_id: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export function useStores(query?: Record<string, string | number>) {
  const params = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
    })
  }
  const qs = params.toString()

  return useQuery<{ stores: AdminStore[] }, Error>({
    queryKey: storesQueryKeys.list(query),
    queryFn: async () => {
      const res = await fetch(`/admin/stores${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch stores')
      return res.json()
    },
  })
}
