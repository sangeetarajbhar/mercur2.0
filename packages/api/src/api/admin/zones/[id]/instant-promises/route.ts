import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import InstantPromiseModuleService from "../../../../../modules/instant-promises/service"
import { INSTANT_PROMISES_MODULE } from "../../../../../modules/instant-promises"
import ZoneModuleService from "../../../../../modules/zone/service"
import { ZONE_MODULE } from "../../../../../modules/zone"
import { updateZoneTimingWorkflow } from "../../../../../workflows/zone/workflows/update-zone-timing"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id: zoneId } = req.params
    const instantPromiseService = req.scope.resolve<InstantPromiseModuleService>(INSTANT_PROMISES_MODULE)

    const instantPromises = await instantPromiseService.listInstantPromises({
      zone_id: zoneId,
    })

    res.json({
      instant_promises: instantPromises,
      count: instantPromises.length,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch instant promises",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id: zoneId } = req.params

    const validatedData = req.validatedBody as Record<string, unknown>
    const instantPromiseService = req.scope.resolve<InstantPromiseModuleService>(INSTANT_PROMISES_MODULE)
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)
    const zoneService = req.scope.resolve<ZoneModuleService>(ZONE_MODULE)

    const createPayload = {
      zone_id: zoneId,
      promise_text: validatedData.promise_text as string,
      promise_minutes: validatedData.promise_minutes as number,
      pickup_lead_minutes: validatedData.pickup_lead_minutes as number,
      return_lead_minutes: validatedData.return_lead_minutes as number,
      is_active: (validatedData.is_active as boolean) ?? true,
      metadata: (validatedData.metadata as Record<string, unknown>) || {},
      created_by: req.auth_context.actor_id,
    }

    const instantPromise = await instantPromiseService.createInstantPromises(createPayload as any)

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
        `Failed to update zone timing after instant promise create: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    await eventBus.emit({
      name: "audit.log",
      data: {
        entity_type: "instant_promise",
        entity_id: instantPromise.id,
        operation: "CREATE",
        new_entity: instantPromise,
        changed_by: req.auth_context.actor_id,
        metadata: { zone_id: zoneId },
      },
    })

    res.status(201).json({
      message: "Instant promise created successfully",
      instant_promise: instantPromise,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to create instant promise",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
