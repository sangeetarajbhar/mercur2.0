import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import SlotOverrideModuleService from "../../../../../../modules/slot-overrides/service"
import { SLOT_OVERRIDES_MODULE } from "../../../../../../modules/slot-overrides"
import { UpdateSlotOverrideInput } from "../../../validation/slot-override-validation"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { overrideId } = req.params

    const slotOverrideService = req.scope.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)
    const slotOverride = await slotOverrideService.retrieveSlotOverrides(overrideId)

    res.json({
      slot_override: slotOverride,
    })
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch slot override",
      details: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { overrideId } = req.params
    const { id: zoneId } = req.params
    const validatedData = (req.validatedBody || req.body) as UpdateSlotOverrideInput

    const slotOverrideService = req.scope.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    const oldSlotOverride = await slotOverrideService.retrieveSlotOverrides(overrideId)

    const updateData = {
      id: overrideId,
      ...validatedData,
      updated_by: req.auth_context.actor_id,
    }
    const updatedSlotOverride = await slotOverrideService.updateSlotOverrides(updateData)

    await eventBus.emit({
      name: "audit.log",
      data: {
        entity_type: "slot_override",
        entity_id: overrideId,
        operation: "UPDATE",
        old_entity: oldSlotOverride,
        new_entity: updatedSlotOverride,
        changed_by: req.auth_context.actor_id,
        metadata: { zone_id: zoneId },
      },
    })

    res.json({
      message: "Slot override updated successfully",
      slot_override: updatedSlotOverride,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to update slot override",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
