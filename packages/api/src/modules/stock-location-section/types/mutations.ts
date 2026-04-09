export type CreateStockLocationSectionDTO = {
  stock_location_id: string,
  address_type: string,
  partner_wh_code: string | undefined,
  lead_time: string | undefined,
  managed_by: string | undefined,
}

export interface UpdateStockLocationSectionDTO {
  id: string
  address_type?: string
  partner_wh_code?: string
  lead_time?: string | undefined
  managed_by?: string | undefined
}
