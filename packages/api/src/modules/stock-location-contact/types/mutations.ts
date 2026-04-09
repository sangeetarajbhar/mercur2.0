export type CreateStockLocationContactDTO = {
  stock_location_section_id: string,
  first_name: string,
  last_name: string,
  email: string,
  phone_number: string,
}

export interface UpdateStockLocationContactDTO {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
}
