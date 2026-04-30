import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeysFactory } from '@mercurjs/dashboard-shared'

export const extraChargeRulesQueryKeys = queryKeysFactory('extra_charge_rules')

const API_BASE = '/admin/extra-charge-rules'

export interface ExtraChargeRule {
  id: string
  extra_charge_id: string
  name: string
  attribute: string
  operator: string
  values: string[]
  priority: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export function useExtraChargeRules() {
  return useQuery<{ extra_charge_rules: ExtraChargeRule[] }, Error, ExtraChargeRule[]>({
    queryKey: extraChargeRulesQueryKeys.list(),
    queryFn: async () => {
      const res = await fetch(API_BASE, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch extra charge rules')
      return res.json()
    },
    select: (data) => data.extra_charge_rules ?? [],
  })
}

export function useExtraChargeRulesByChargeId(extraChargeId: string | undefined) {
  return useQuery<{ extra_charge_rules: ExtraChargeRule[] }, Error, ExtraChargeRule[]>({
    queryKey: [...extraChargeRulesQueryKeys.list(), 'by-charge-id', extraChargeId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}?extra_charge_id=${extraChargeId}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch extra charge rules')
      return res.json()
    },
    select: (data) => data.extra_charge_rules ?? [],
    enabled: !!extraChargeId,
  })
}

export function useCreateExtraChargeRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<ExtraChargeRule, 'id' | 'created_at' | 'updated_at'>) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create extra charge rule')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: extraChargeRulesQueryKeys.all })
    },
  })
}

export function useUpdateExtraChargeRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ExtraChargeRule> & { id: string }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to update extra charge rule')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: extraChargeRulesQueryKeys.all })
    },
  })
}

export function useDeleteExtraChargeRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete extra charge rule')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: extraChargeRulesQueryKeys.all })
    },
  })
}
