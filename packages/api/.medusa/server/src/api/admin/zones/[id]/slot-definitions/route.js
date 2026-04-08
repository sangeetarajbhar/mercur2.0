"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
const utils_1 = require("@medusajs/framework/utils");
const create_bulk_slot_definition_1 = require("../../../../../workflows/slot-definitions/workflows/create-bulk-slot-definition");
const slot_definitions_1 = require("../../../../../modules/slot-definitions");
async function GET(req, res) {
    try {
        const { id: zoneId } = req.params;
        const slotDefinitionService = req.scope.resolve(slot_definitions_1.SLOT_DEFINITIONS_MODULE);
        const slotDefinitions = await slotDefinitionService.listSlotDefinitions({
            zone_id: zoneId,
        });
        res.json({
            slot_definitions: slotDefinitions,
            count: slotDefinitions.length,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to fetch slot definitions",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
async function POST(req, res) {
    try {
        const { id: zoneId } = req.params;
        const validatedData = req.validatedBody;
        const workflowInput = {
            zone_id: zoneId,
            slots: validatedData.slots,
            created_by: req.auth_context.actor_id,
        };
        const { result } = await (0, create_bulk_slot_definition_1.createBulkSlotDefinitionWorkflow)(req.scope).run({
            input: workflowInput,
        });
        res.status(201).json({
            message: `${result.length} slot definition(s) created successfully`,
            slot_definitions: result,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to create slot definitions",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
async function PUT(req, res) {
    try {
        const { id: zoneId } = req.params;
        const { slots } = req.body;
        if (!slots || !Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({
                error: "Invalid request: 'slots' array is required and must not be empty",
            });
        }
        const slotDefinitionService = req.scope.resolve(slot_definitions_1.SLOT_DEFINITIONS_MODULE);
        const eventBus = req.scope.resolve(utils_1.Modules.EVENT_BUS);
        const updatedSlots = await Promise.all(slots.map(async (slotData) => {
            const { id, ...updateData } = slotData;
            return await slotDefinitionService.updateSlotDefinitions({
                ...updateData,
                id,
                updated_by: req.auth_context.actor_id,
            });
        }));
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
                    slot_ids: updatedSlots.map((s) => s.id),
                },
            },
        });
        res.json({
            message: `${updatedSlots.length} slot definition(s) updated successfully`,
            updated_count: updatedSlots.length,
            slot_definitions: updatedSlots,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to update slot definitions",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL1tpZF0vc2xvdC1kZWZpbml0aW9ucy9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLGtCQW1CQztBQUVELG9CQXlCQztBQUVELGtCQW9EQztBQTFHRCxxREFBbUQ7QUFDbkQsaUlBQWtJO0FBRWxJLDhFQUFpRjtBQUcxRSxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQStCLEVBQUUsR0FBbUI7SUFDNUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBQ2pDLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQThCLDBDQUF1QixDQUFDLENBQUE7UUFFckcsTUFBTSxlQUFlLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQztZQUN0RSxPQUFPLEVBQUUsTUFBTTtTQUNoQixDQUFDLENBQUE7UUFFRixHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ1AsZ0JBQWdCLEVBQUUsZUFBZTtZQUNqQyxLQUFLLEVBQUUsZUFBZSxDQUFDLE1BQU07U0FDOUIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuQixLQUFLLEVBQUUsa0NBQWtDO1lBQ3pDLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQ2hFLENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLElBQUksQ0FBQyxHQUErQixFQUFFLEdBQW1CO0lBQzdFLElBQUks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