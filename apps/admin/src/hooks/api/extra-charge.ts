import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeysFactory } from '@mercurjs/dashboard-shared'

export const extraChargesQueryKeys = queryKeysFactory('extra_charges')
export const extraChargeRulesQueryKeys = queryKeysFactory('extra_charge_rules')

const API_BASE = '/admin/extra-charge'

export interface ExtraCharge {
  id: string
  name: string
  amount: number
  status: 'active' | 'inactive'
  type?: string
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export function useExtraCharges() {
  return useQuery<{ extra_charges: ExtraCharge[] }, Error, ExtraCharge[]>({
    queryKey: extraChargesQueryKeys.list(),
    queryFn: async () => {
      const res = await fetch(API_BASE, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch extra charges')
      return res.json()
    },
    select: (data) => data.extra_charges ?? [],
  })
}

export function useExtraCharge(id: string | undefined) {
  return useQuery<{ extra_charge: ExtraCharge }, Error, ExtraCharge>({
    queryKey: extraChargesQueryKeys.detail(id ?? ''),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch extra charge')
      return res.json()
    },
    select: (data) => data.extra_charge,
    enabled: !!id,
  })
}

export function useCreateExtraCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; amount: number; status: string; type?: string }) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, amount: +payload.amount }),
      })
      if (!res.ok) throw new Error('Failed to create extra charge')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: extraChargesQueryKeys.all })
    },
  })
}

export function useUpdateExtraCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [key: string]: unknown }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to update extra charge')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: extraChargesQueryKeys.all })
    },
  })
}

export function useDeleteExtraCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete extra charge')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: extraChargesQueryKeys.all })
    },
  })
}
