"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const slot_definitions_1 = require("../../../../../../modules/slot-definitions");
async function POST(req, res) {
    try {
        const { slotId, id: zoneId } = req.params;
        const validatedData = req.validatedBody;
        const slotDefinitionService = req.scope.resolve(slot_definitions_1.SLOT_DEFINITIONS_MODULE);
        const eventBus = req.scope.resolve(utils_1.Modules.EVENT_BUS);
        const oldSlotDefinition = await slotDefinitionService.retrieveSlotDefinitions(slotId);
        const updatedSlotDefinition = await slotDefinitionService.updateSlotDefinitions({
            ...validatedData,
            id: slotId,
            updated_by: req.auth_context.actor_id,
        });
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
        });
        res.json({
            message: "Slot definition updated successfully",
            slot_definition: updatedSlotDefinition,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to update slot definition",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL1tpZF0vc2xvdC1kZWZpbml0aW9ucy9bc2xvdElkXS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU1BLG9CQXVDQztBQTVDRCxxREFBbUQ7QUFFbkQsaUZBQW9GO0FBRzdFLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBK0IsRUFBRSxHQUFtQjtJQUM3RSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBRXpDLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUEwQyxDQUFBO1FBQ3BFLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQThCLDBDQUF1QixDQUFDLENBQUE7UUFDckcsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXJELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVyRixNQUFNLHFCQUFxQixHQUFHLE1BQU0scUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDOUUsR0FBRyxhQUFhO1lBQ2hCLEVBQUUsRUFBRSxNQUFNO1lBQ1YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUTtTQUN0QyxDQUFDLENBQUE7UUFFRixNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDbEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsSUFBSSxFQUFFO2dCQUNKLFdBQVcsRUFBRSxpQkFBaUI7Z0JBQzlCLFNBQVMsRUFBRSxNQUFNO2dCQUNqQixTQUFTLEVBQUUsUUFBUTtnQkFDbkIsVUFBVSxFQUFFLGlCQUFpQjtnQkFDN0IsVUFBVSxFQUFFLHFCQUFxQjtnQkFDakMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUTtnQkFDckMsUUFBUSxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTthQUM5QjtTQUNGLENBQUMsQ0FBQTtRQUVGLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDUCxPQUFPLEVBQUUsc0NBQXNDO1lBQy9DLGVBQWUsRUFBRSxxQkFBcUI7U0FDdkMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuQixLQUFLLEVBQUUsa0NBQWtDO1lBQ3pDLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQ2hFLENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDIn0=