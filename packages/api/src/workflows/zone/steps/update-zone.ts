import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ZONE_MODULE } from "../../../modules/zone"
import ZoneModuleService, { Zone, UpdateZoneDTO } from "../../../modules/zone/service"
import { calculateZoneTiming } from "../../../modules/zone/utils/zone-timing-calculator"

export const updateZoneStep = createStep(
  "update-zone",
  async (input: UpdateZoneStepInput, { container }) => {
    const zoneService = container.resolve<ZoneModuleService>(ZONE_MODULE)
    const oldZone = await zoneService.retrieveZones(input.zone_id)

    const targetLocationId = input.location_id || oldZone.location_id
    const zoneTiming = await calculateZoneTiming(container, targetLocationId, input.zone_id)

    const updateData: UpdateZoneDTO = {
      id: input.zone_id,
      name: input.name,
      description: input.description || null,
      postcodes: input.postcodes,
      is_active: input.is_active,
      updated_by: input.updated_by || null,
      start_time: zoneTiming.start_time,
      end_time: zoneTiming.effective_end_time,
    }

    if (input.location_id) {
      updateData.location_id = input.location_id
    }

    // @ts-expect-error - MedusaService generates this method
    const updatedZone = await zoneService.updateZones(updateData)

    return new StepResponse({
      oldZone: oldZone as unknown as Zone,
      updatedZone,
    })
  }
)

export type UpdateZoneStepInput = {
  zone_id: string
  location_id?: string
  name: string
  description?: string
  postcodes: string[]
  is_active: boolean
  updated_by?: string
}
