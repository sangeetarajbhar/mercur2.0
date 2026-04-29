import { useQuery } from '@tanstack/react-query'
import { queryKeysFactory } from '@mercurjs/dashboard-shared'

export const productTypesQueryKeys = queryKeysFactory('product_types')
export const productCategoriesQueryKeys = queryKeysFactory('product_categories')

export interface ProductType {
  id: string
  value: string
  created_at: string
  updated_at: string
}

export interface ProductCategory {
  id: string
  name: string
  handle: string
  created_at: string
  updated_at: string
}

export function useProductTypes(query?: Record<string, string | number>) {
  const params = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
    })
  }
  const qs = params.toString()

  const { data, ...rest } = useQuery<{ product_types: ProductType[] }, Error>({
    queryKey: productTypesQueryKeys.list(query),
    queryFn: async () => {
      const res = await fetch(`/admin/product-types${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch product types')
      return res.json()
    },
  })

  return { product_types: data?.product_types ?? [], ...rest }
}

export function useProductCategories(query?: Record<string, string | number>) {
  const params = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
    })
  }
  const qs = params.toString()

  const { data, ...rest } = useQuery<{ product_categories: ProductCategory[] }, Error>({
    queryKey: productCategoriesQueryKeys.list(query),
    queryFn: async () => {
      const res = await fetch(`/admin/product-categories${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch product categories')
      return res.json()
    },
  })

  return { product_categories: data?.product_categories ?? [], ...rest }
}
