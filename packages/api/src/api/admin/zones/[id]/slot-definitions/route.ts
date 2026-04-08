import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { createBulkSlotDefinitionWorkflow } from "../../../../../workflows/slot-definitions/workflows/create-bulk-slot-definition"
import SlotDefinitionModuleService from "../../../../../modules/slot-definitions/service"
import { SLOT_DEFINITIONS_MODULE } from "../../../../../modules/slot-definitions"
import { CreateBulkSlotDefinitionInput, BulkUpdateSlotDefinitionInput } from "../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id: zoneId } = req.params
    const slotDefinitionService = req.scope.resolve<SlotDefinitionModuleService>(SLOT_DEFINITIONS_MODULE)

    const slotDefinitions = await slotDefinitionService.listSlotDefinitions({
      zone_id: zoneId,
    })

    res.json({
      slot_definitions: slotDefinitions,
      count: slotDefinitions.length,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch slot definitions",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id: zoneId } = req.params
    const validatedData = req.validatedBody as CreateBulkSlotDefinitionInput

    const workflowInput = {
      zone_id: zoneId,
      slots: validatedData.slots,
      created_by: req.auth_context.actor_id,
    }

    const { result } = await createBulkSlotDefinitionWorkflow(req.scope).run({
      input: workflowInput,
    })

    res.status(201).json({
      message: `${result.length} slot definition(s) created successfully`,
      slot_definitions: result,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to create slot definitions",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function PUT(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id: zoneId } = req.params
    const { slots } = req.body as BulkUpdateSlotDefinitionInput

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        error: "Invalid request: 'slots' array is required and must not be empty",
      })
    }

    const slotDefinitionService = req.scope.resolve<SlotDefinitionModuleService>(SLOT_DEFINITIONS_MODULE)
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    const updatedSlots = await Promise.all(
      slots.map(async (slotData) => {
        const { id, ...updateData } = slotData
        return await slotDefinitionService.updateSlotDefinitions({
          ...updateData,
          id,
          updated_by: req.auth_context.actor_id,
        })
      })
    )

    await eventBus.emit({
      name: "audit.log",
      data: {
        entity_type: "slot_definition_bulk",
        entity_id: zoneId,
        operation: "UPDATE_BULK",
        new_entity: updatedSlots,
        changed_by: req.auth_context.actor_id,
        metadata: {
          zone_id: zoneId,
          updated_count: updatedSlots.length,
          slot_ids: updatedSlots.map((s: { id: string }) => s.id),
        },
      },
    })

    res.json({
      message: `${updatedSlots.length} slot definition(s) updated successfully`,
      updated_count: updatedSlots.length,
      slot_definitions: updatedSlots,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to update slot definitions",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
