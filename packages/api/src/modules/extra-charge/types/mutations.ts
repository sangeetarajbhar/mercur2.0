export type CreateExtraChargeDTO = {
  name: string
  amount: string
  status?: 'active' | 'inactive'
  created_by: string
  updated_by: string
}

export type UpdateExtraChargeDTO = Partial<CreateExtraChargeDTO> & {
  id: string
}
