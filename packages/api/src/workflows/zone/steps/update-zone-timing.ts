import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ZONE_MODULE } from "../../../modules/zone"
import ZoneModuleService, { UpdateZoneDTO } from "../../../modules/zone/service"
import { calculateZoneTiming } from "../../../modules/zone/utils/zone-timing-calculator"

export const updateZoneTimingStep = createStep(
  "update-zone-timing",
  async (input: UpdateZoneTimingStepInput, { container }) => {
    const zoneService = container.resolve<ZoneModuleService>(ZONE_MODULE)
    const zones = await zoneService.listZones({ location_id: input.location_id })

    if (zones.length === 0) {
      return new StepResponse({ updated_zones_count: 0 })
    }

    let updatedCount = 0

    for (const zone of zones) {
      const zoneTiming = await calculateZoneTiming(container, input.location_id, zone.id)

      const updateData: UpdateZoneDTO = {
        id: zone.id,
        start_time: zoneTiming.start_time,
        end_time: zoneTiming.effective_end_time,
        updated_by: input.updated_by || null,
      }

      // @ts-expect-error - MedusaService generates this method
      await zoneService.updateZones(updateData)
      updatedCount++
    }

    return new StepResponse({ updated_zones_count: updatedCount })
  }
)

export type UpdateZoneTimingStepInput = {
  location_id: string
  updated_by?: string
}
