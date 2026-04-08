"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const slot_overrides_1 = require("../../../../../../modules/slot-overrides");
const utils_1 = require("@medusajs/framework/utils");
async function GET(req, res) {
    try {
        const { overrideId } = req.params;
        const slotOverrideService = req.scope.resolve(slot_overrides_1.SLOT_OVERRIDES_MODULE);
        const slotOverride = await slotOverrideService.retrieveSlotOverrides(overrideId);
        res.json({
            slot_override: slotOverride,
        });
    }
    catch (err) {
        res.status(500).json({
            error: "Failed to fetch slot override",
            details: err instanceof Error ? err.message : String(err),
        });
    }
}
async function POST(req, res) {
    try {
        const { overrideId } = req.params;
        const { id: zoneId } = req.params;
        const validatedData = (req.validatedBody || req.body);
        const slotOverrideService = req.scope.resolve(slot_overrides_1.SLOT_OVERRIDES_MODULE);
        const eventBus = req.scope.resolve(utils_1.Modules.EVENT_BUS);
        const oldSlotOverride = await slotOverrideService.retrieveSlotOverrides(overrideId);
        const updateData = {
            id: overrideId,
            ...validatedData,
            updated_by: req.auth_context.actor_id,
        };
        const updatedSlotOverride = await slotOverrideService.updateSlotOverrides(updateData);
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
        });
        res.json({
            message: "Slot override updated successfully",
            slot_override: updatedSlotOverride,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to update slot override",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL1tpZF0vc2xvdC1vdmVycmlkZXMvW292ZXJyaWRlSWRdL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBTUEsa0JBZ0JDO0FBRUQsb0JBeUNDO0FBL0RELDZFQUFnRjtBQUVoRixxREFBbUQ7QUFFNUMsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUErQixFQUFFLEdBQW1CO0lBQzVFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBRWpDLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQTRCLHNDQUFxQixDQUFDLENBQUE7UUFDL0YsTUFBTSxZQUFZLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVoRixHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ1AsYUFBYSxFQUFFLFlBQVk7U0FDNUIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuQixLQUFLLEVBQUUsK0JBQStCO1lBQ3RDLE9BQU8sRUFBRSxHQUFHLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1NBQzFELENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLElBQUksQ0FBQyxHQUErQixFQUFFLEdBQW1CO0lBQzdFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBQ2pDLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQTtRQUNqQyxNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLElBQUksQ0FBNEIsQ0FBQTtRQUVoRixNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUE0QixzQ0FBcUIsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVyRCxNQUFNLGVBQWUsR0FBRyxNQUFNLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRW5GLE1BQU0sVUFBVSxHQUFHO1lBQ2pCLEVBQUUsRUFBRSxVQUFVO1lBQ2QsR0FBRyxhQUFhO1lBQ2hCLFVBQVUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVE7U0FDdEMsQ0FBQTtRQUNELE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVyRixNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDbEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsSUFBSSxFQUFFO2dCQUNKLFdBQVcsRUFBRSxlQUFlO2dCQUM1QixTQUFTLEVBQUUsVUFBVTtnQkFDckIsU0FBUyxFQUFFLFFBQVE7Z0JBQ25CLFVBQVUsRUFBRSxlQUFlO2dCQUMzQixVQUFVLEVBQUUsbUJBQW1CO2dCQUMvQixVQUFVLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRO2dCQUNyQyxRQUFRLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFO2FBQzlCO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNQLE9BQU8sRUFBRSxvQ0FBb0M7WUFDN0MsYUFBYSxFQUFFLG1CQUFtQjtTQUNuQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ25CLEtBQUssRUFBRSxnQ0FBZ0M7WUFDdkMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7U0FDaEUsQ0FBQyxDQUFBO0lBQ0osQ0FBQztBQUNILENBQUMifQ==