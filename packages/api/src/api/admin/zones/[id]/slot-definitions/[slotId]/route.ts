import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import SlotDefinitionModuleService from "../../../../../../modules/slot-definitions/service"
import { SLOT_DEFINITIONS_MODULE } from "../../../../../../modules/slot-definitions"
import { UpdateSlotDefinitionInput } from "../../../validators"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { slotId, id: zoneId } = req.params

    const validatedData = req.validatedBody as UpdateSlotDefinitionInput
    const slotDefinitionService = req.scope.resolve<SlotDefinitionModuleService>(SLOT_DEFINITIONS_MODULE)
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    const oldSlotDefinition = await slotDefinitionService.retrieveSlotDefinitions(slotId)

    const updatedSlotDefinition = await slotDefinitionService.updateSlotDefinitions({
      ...validatedData,
      id: slotId,
      updated_by: req.auth_context.actor_id,
    })

    await eventBus.emit({
      name: "audit.log",
      data: {
        entity_type: "slot_definition",
        entity_id: slotId,
        operation: "UPDATE",
        old_entity: oldSlotDefinition,
        new_entity: updatedSlotDefinition,
        changed_by: req.auth_context.actor_id,
        metadata: { zone_id: zoneId },
      },
    })

    res.json({
      message: "Slot definition updated successfully",
      slot_definition: updatedSlotDefinition,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to update slot definition",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
