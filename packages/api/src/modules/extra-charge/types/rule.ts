export type ExtraChargeRuleDTO = {
  id: string
  extra_charge_id: string
  name: string
  description?: string
  attribute: string
  operator: 'eq' | 'in' | 'gt' | 'lt' | 'gte' | 'lte'
  values: string[]
  min_cart_total?: number
  max_cart_total?: number
  min_quantity?: number
  max_quantity?: number
  priority: number
  status: 'active' | 'inactive'
  starts_at?: Date
  ends_at?: Date
  metadata?: Record<string, any>
  created_by: string
  updated_by: string
  created_at: Date
  updated_at: Date
}

export type CreateExtraChargeRuleDTO = {
  extra_charge_id: string
  name: string
  description?: string
  attribute: string
  operator: 'eq' | 'in' | 'gt' | 'lt' | 'gte' | 'lte'
  values: string[]
  min_cart_total?: number
  max_cart_total?: number
  min_quantity?: number
  max_quantity?: number
  priority?: number
  status?: 'active' | 'inactive'
  starts_at?: Date
  ends_at?: Date
  metadata?: Record<string, any>
  created_by: string
  updated_by: string
}

export type UpdateExtraChargeRuleDTO = Partial<CreateExtraChargeRuleDTO> & {
  id: string
}
