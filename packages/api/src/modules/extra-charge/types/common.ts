export type ExtraChargeDTO = {
  id: string
  name: string
  amount: number
  status: 'active' | 'inactive'
  created_by: string
  updated_by: string
  created_at: Date
  updated_at: Date
}
