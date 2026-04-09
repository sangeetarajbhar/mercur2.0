export type CreateStockLocationExtensionDTO = {
  location_type: string,
  address_type: string,
  latitude: number | null,
  longitude: number | null,
  partner_id: string,
  return_location_id: string,
  status: string,
  servisibility_status: string,
  start_time: string,
  end_time: string,
  created_by: string,
  updated_by: string
}

export interface UpdateStockLocationExtensionDTO {
  id: string
  location_type?: string
  address_type?: string
  latitude?: number | null
  longitude?: number | null
  partner_id?: string
  return_location_id?: string
  status?: string
  servisibility_status?: string
  start_time?: string
  end_time?: string
  updated_by: string
}
