import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import SlotOverrideModuleService from "../../../../../modules/slot-overrides/service"
import { SLOT_OVERRIDES_MODULE } from "../../../../../modules/slot-overrides"
import { CreateSlotOverrideInput, QuerySlotOverrideInput } from "../../validation/slot-override-validation"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id: zoneId } = req.params
    const query = req.query as unknown as QuerySlotOverrideInput

    const slotOverrideService = req.scope.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)

    const filters: Record<string, any> = { zone_id: zoneId }

    if (query.slot_date) {
      if (typeof query.slot_date === "string" && query.slot_date.includes(",")) {
        filters.slot_date = query.slot_date.split(",").map((d) => d.trim())
      } else {
        filters.slot_date = query.slot_date
      }
    }

    if (query.is_active !== undefined) filters.is_active = query.is_active

    const slotOverrides = await slotOverrideService.listSlotOverrides(filters, {
      skip: query.offset || 0,
      take: query.limit || 100,
    })

    res.json({
      slot_overrides: slotOverrides,
      count: slotOverrides.length,
    })
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch slot overrides",
      details: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id: zoneId } = req.params
    const validatedData = (req.validatedBody || req.body) as CreateSlotOverrideInput

    const slotOverrideService = req.scope.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    const slotOverridePayload = {
      ...validatedData,
      zone_id: zoneId,
      created_by: req.auth_context.actor_id,
      updated_by: req.auth_context.actor_id,
    }
    const slotOverride = await slotOverrideService.createSlotOverrides(slotOverridePayload)

    await eventBus.emit({
      name: "audit.log",
      data: {
        entity_type: "slot_override",
        entity_id: slotOverride.id,
        operation: "CREATE",
        new_entity: slotOverride,
        changed_by: req.auth_context.actor_id,
        metadata: { zone_id: zoneId },
      },
    })

    res.status(201).json({
      message: "Slot override created successfully",
      slot_override: slotOverride,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to create slot override",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
