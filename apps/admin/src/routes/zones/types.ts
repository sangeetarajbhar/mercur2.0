export interface InstantPromise {
    id: string
    zone_id: string
    promise_text: string
    promise_minutes: number
    pickup_lead_minutes: number
    return_lead_minutes: number
    is_active: boolean
    metadata: Record<string, unknown>
    created_at: Date
    updated_at: Date
    created_by?: string
    updated_by?: string
  }
  
  export interface Zone {
    id: string
    name: string
    description?: string
    postcodes: string[]
    is_active: boolean
    location_id: string
    location_name?: string
    start_time?: string
    end_time?: string
    metadata: Record<string, unknown>
    created_at: Date
    updated_at: Date
    created_by?: string
    updated_by?: string
    instant_promises?: InstantPromise[]
  }
  
  export type ZonesResponse = {
    zones?: Zone[]
    isLoading: boolean
  }
  
  export interface CreateZoneRequest {
    name: string
    description?: string
    postcodes: string[]
    is_active?: boolean
    location_id: string
  }
  
  export interface UpdateZoneRequest {
    name?: string
    description?: string
    postcodes?: string[]
    is_active?: boolean
    location_id?: string
  }
  