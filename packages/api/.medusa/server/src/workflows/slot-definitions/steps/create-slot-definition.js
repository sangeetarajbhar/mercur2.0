"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBulkSlotDefinitionStep = exports.createSlotDefinitionStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const slot_definitions_1 = require("../../../modules/slot-definitions");
exports.createSlotDefinitionStep = (0, workflows_sdk_1.createStep)("create-slot-definition", async (input, { container }) => {
    const slotDefinitionService = container.resolve(slot_definitions_1.SLOT_DEFINITIONS_MODULE);
    const slotDefinitionPayload = {
        zone_id: input.zone_id,
        slot_key: input.slot_key,
        start_time: input.start_time,
        end_time: input.end_time,
        default_capacity: input.default_capacity,
        is_active: input.is_active,
        cut_off_time: input.cut_off_time,
        created_by: input.created_by || null,
        updated_by: input.created_by || null,
    };
    const slotDefinition = await slotDefinitionService.createSlotDefinitions(slotDefinitionPayload);
    return new workflows_sdk_1.StepResponse(slotDefinition);
});
exports.createBulkSlotDefinitionStep = (0, workflows_sdk_1.createStep)("create-bulk-slot-definition", async (input, { container }) => {
    const slotDefinitionService = container.resolve(slot_definitions_1.SLOT_DEFINITIONS_MODULE);
    const slotDefinitionsPayload = input.slots.map((slot) => ({
        zone_id: input.zone_id,
        slot_key: slot.slot_key,
        start_time: slot.start_time,
        end_time: slot.end_time,
        default_capacity: slot.default_capacity,
        is_active: slot.is_active,
        cut_off_time: slot.cut_off_time,
        created_by: input.created_by || null,
        updated_by: input.created_by || null,
    }));
    const slotDefinitions = await Promise.all(slotDefinitionsPayload.map((payload) => slotDefinitionService.createSlotDefinitions(payload)));
    return new workflows_sdk_1.StepResponse(slotDefinitions);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXNsb3QtZGVmaW5pdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3Mvc2xvdC1kZWZpbml0aW9ucy9zdGVwcy9jcmVhdGUtc2xvdC1kZWZpbml0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUE0RTtBQUM1RSx3RUFBMkU7QUFHOUQsUUFBQSx3QkFBd0IsR0FBRyxJQUFBLDBCQUFVLEVBQ2hELHdCQUF3QixFQUN4QixLQUFLLEVBQUUsS0FBb0MsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUU7SUFDNUQsTUFBTSxxQkFBcUIsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUE4QiwwQ0FBdUIsQ0FBQyxDQUFBO0lBRXJHLE1BQU0scUJBQXFCLEdBQUc7UUFDNUIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1FBQ3RCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtRQUN4QixVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVU7UUFDNUIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1FBQ3hCLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxnQkFBZ0I7UUFDeEMsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1FBQzFCLFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWTtRQUNoQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxJQUFJO1FBQ3BDLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUk7S0FDckMsQ0FBQTtJQUVELE1BQU0sY0FBYyxHQUFHLE1BQU0scUJBQXFCLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUMvRixPQUFPLElBQUksNEJBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQTtBQUN6QyxDQUFDLENBQ0YsQ0FBQTtBQUVZLFFBQUEsNEJBQTRCLEdBQUcsSUFBQSwwQkFBVSxFQUNwRCw2QkFBNkIsRUFDN0IsS0FBSyxFQUFFLEtBQXdDLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFO0lBQ2hFLE1BQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBOEIsMENBQXVCLENBQUMsQ0FBQTtJQUVyRyxNQUFNLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztRQUN0QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7UUFDdkIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1FBQzNCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtRQUN2QixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1FBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztRQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7UUFDL0IsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLElBQUksSUFBSTtRQUNwQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxJQUFJO0tBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBRUgsTUFBTSxlQUFlLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUN2QyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQzlGLENBQUE7SUFFRCxPQUFPLElBQUksNEJBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUMxQyxDQUFDLENBQ0YsQ0FBQSJ9