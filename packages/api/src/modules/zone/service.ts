import { MedusaService } from "@medusajs/framework/utils"
import { Zones } from "./models/zone"

export type Zone = {
  id: string
  location_id: string
  name: string
  description: string | null
  postcodes: string[]
  is_active: boolean
  start_time: string | null
  end_time: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export type CreateZoneDTO = {
  location_id: string
  name: string
  description?: string | null
  postcodes: string[]
  is_active?: boolean
  start_time?: string | null
  end_time?: string | null
  metadata?: Record<string, unknown>
  created_by?: string | null
  updated_by?: string | null
}

export type UpdateZoneDTO = {
  id: string
  location_id?: string
  name?: string
  description?: string | null
  postcodes?: string[]
  is_active?: boolean
  start_time?: string | null
  end_time?: string | null
  metadata?: Record<string, unknown>
  updated_by?: string | null
}

class ZoneModuleService extends MedusaService({
  Zones,
}) {}

export default ZoneModuleService
