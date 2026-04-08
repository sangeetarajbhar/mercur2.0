import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ZONE_MODULE } from "../../../modules/zone"
import ZoneModuleService, { Zone, CreateZoneDTO } from "../../../modules/zone/service"
import { calculateZoneTiming } from "../../../modules/zone/utils/zone-timing-calculator"

export const createZoneStep = createStep(
  "create-zone",
  async (input: CreateZoneStepInput, { container }): Promise<StepResponse<Zone>> => {
    const zoneService = container.resolve<ZoneModuleService>(ZONE_MODULE)

    const zoneData: CreateZoneDTO = {
      location_id: input.location_id,
      name: input.name,
      description: input.description || null,
      postcodes: input.postcodes,
      is_active: input.is_active,
      created_by: input.created_by || null,
      updated_by: input.updated_by || null,
    }

    // @ts-expect-error - MedusaService generates this method
    const zone = await zoneService.createZones(zoneData)
    const zoneTiming = await calculateZoneTiming(container, input.location_id, zone.id)

    const updatedZone = await zoneService.updateZones({
      id: zone.id,
      start_time: zoneTiming.start_time,
      end_time: zoneTiming.effective_end_time,
    })

    return new StepResponse(updatedZone as unknown as Zone)
  }
)

export type CreateZoneStepInput = {
  location_id: string
  name: string
  description?: string
  postcodes: string[]
  is_active: boolean
  created_by?: string
  updated_by?: string
}
