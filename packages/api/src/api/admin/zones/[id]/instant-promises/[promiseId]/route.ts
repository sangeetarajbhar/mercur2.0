import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import InstantPromiseModuleService from "../../../../../../modules/instant-promises/service"
import { INSTANT_PROMISES_MODULE } from "../../../../../../modules/instant-promises"
import ZoneModuleService from "../../../../../../modules/zone/service"
import { ZONE_MODULE } from "../../../../../../modules/zone"
import { updateZoneTimingWorkflow } from "../../../../../../workflows/zone/workflows/update-zone-timing"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { promiseId, id: zoneId } = req.params

    const validatedData = req.validatedBody as Record<string, unknown>
    const instantPromiseService = req.scope.resolve<InstantPromiseModuleService>(INSTANT_PROMISES_MODULE)
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)
    const zoneService = req.scope.resolve<ZoneModuleService>(ZONE_MODULE)

    const oldInstantPromise = await instantPromiseService.retrieveInstantPromises(promiseId)

    const updatedInstantPromise = await instantPromiseService.updateInstantPromises({
      ...validatedData,
      id: promiseId,
      updated_by: req.auth_context.actor_id,
    })

    try {
      const zone = await zoneService.retrieveZones(zoneId)
      if (zone?.location_id) {
        await updateZoneTimingWorkflow(req.scope).run({
          input: {
            location_id: zone.location_id,
            updated_by: req.auth_context.actor_id || "system",
          },
        })
      }
    } catch (e) {
      console.warn(
        `Failed to update zone timing after instant promise update: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    await eventBus.emit({
      name: "audit.log",
      data: {
        entity_type: "instant_promise",
        entity_id: promiseId,
        operation: "UPDATE",
        old_entity: oldInstantPromise,
        new_entity: updatedInstantPromise,
        changed_by: req.auth_context.actor_id,
        metadata: { zone_id: zoneId },
      },
    })

    res.json({
      message: "Instant promise updated successfully",
      instant_promise: updatedInstantPromise,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to update instant promise",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
