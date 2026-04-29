export type ExtraCharge = {
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
