import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import { queryKeysFactory } from '@mercurjs/dashboard-shared'

import { CommissionLine } from '../../routes/commission-lines/types'
import {
  AdminCommissionAggregate,
  CommissionRule,
  CreateCommissionRule,
  UpdateCommissionRule,
  UpsertDefaultCommissionRule,
} from '../../routes/commission/types'

export const commissionRulesQueryKeys = queryKeysFactory('commission_rule')

const buildQS = (query?: Record<string, unknown>): string => {
  if (!query) return ''
  const sp = new URLSearchParams()
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    sp.set(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

const apiFetch = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { credentials: 'include', ...init })
  if (!res.ok) {
    let msg = 'Server error'
    try {
      const body = await res.json()
      msg = body.message || body.error || msg
    } catch {
      msg = res.statusText || msg
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const useCommissionRules = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<
      { commission_rules: CommissionRule[]; count?: number },
      Error,
      { commission_rules: CommissionRule[]; count?: number },
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...other } = useQuery({
    queryKey: commissionRulesQueryKeys.list(query),
    queryFn: () =>
      apiFetch<{ commission_rules: CommissionRule[]; count?: number }>(
        `/admin/commission/rules${buildQS(query)}`
      ),
    ...options,
  })

  return { ...data, ...other }
}

export const useDefaultCommissionRule = (
  options?: Omit<
    UseQueryOptions<
      { commission_rule?: AdminCommissionAggregate },
      Error,
      { commission_rule?: AdminCommissionAggregate },
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...other } = useQuery({
    queryKey: commissionRulesQueryKeys.detail('default'),
    queryFn: () =>
      apiFetch<{ commission_rule?: AdminCommissionAggregate }>('/admin/commission/default'),
    ...options,
  })

  return { ...data, ...other }
}

export const useCommissionRule = (
  id: string,
  options?: Omit<
    UseQueryOptions<
      { commission_rule?: AdminCommissionAggregate },
      Error,
      { commission_rule?: AdminCommissionAggregate },
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...other } = useQuery({
    queryKey: commissionRulesQueryKeys.detail(id),
    queryFn: () =>
      apiFetch<{ commission_rule?: AdminCommissionAggregate }>(`/admin/commission/rules/${id}`),
    ...options,
  })

  return { ...data, ...other }
}

export const useCreateCommisionRule = (
  options: UseMutationOptions<
    { commission_rule?: CommissionRule },
    Error,
    CreateCommissionRule
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      apiFetch<{ commission_rule?: CommissionRule }>('/admin/commission/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    ...options,
  })
}

export const useUpdateCommisionRule = (
  options: UseMutationOptions<
    { commission_rule?: CommissionRule },
    Error,
    { id: string } & UpdateCommissionRule
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      apiFetch<{ commission_rule?: CommissionRule }>(
        `/admin/commission/rules/${payload.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: payload.is_active }),
        }
      ),
    ...options,
  })
}

export const useUpsertDefaultCommisionRule = (
  options: UseMutationOptions<
    { commission_rule?: CommissionRule },
    Error,
    UpsertDefaultCommissionRule
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      apiFetch<{ commission_rule?: CommissionRule }>('/admin/commission/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    ...options,
  })
}

export const useDeleteCommisionRule = (
  options: UseMutationOptions<
    { id?: string; object?: string; deleted?: boolean },
    Error,
    { id: string }
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      apiFetch<{ id?: string; object?: string; deleted?: boolean }>(
        `/admin/commission/rules/${payload.id}`,
        { method: 'DELETE' }
      ),
    ...options,
  })
}

export const useListCommissionLines = (
  query?: Record<string, string | number>
) => {
  return useQuery<{ commission_lines: CommissionLine[]; count: number }, Error>({
    queryKey: ['commission-lines', query],
    queryFn: () =>
      apiFetch<{ commission_lines: CommissionLine[]; count: number }>(
        `/admin/commission/commission-lines${buildQS(query)}`
      ),
  })
}
