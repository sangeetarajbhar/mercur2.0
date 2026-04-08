"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBulkSlotDefinitionWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const steps_1 = require("../steps");
exports.createBulkSlotDefinitionWorkflow = (0, workflows_sdk_1.createWorkflow)({
    name: "create-bulk-slot-definition",
}, function (input) {
    const slotDefinitions = (0, steps_1.createBulkSlotDefinitionStep)(input);
    const eventData = (0, workflows_sdk_1.transform)({ slotDefinitions, input }, ({ slotDefinitions, input }) => ({
        entity_type: "slot_definition_bulk",
        entity_id: input.zone_id,
        operation: "CREATE_BULK",
        new_entity: slotDefinitions,
        changed_by: input.created_by || null,
        metadata: {
            zone_id: input.zone_id,
            count: slotDefinitions.length,
            slot_ids: slotDefinitions.map((s) => s.id),
        },
    }));
    (0, core_flows_1.emitEventStep)({
        eventName: "audit.log",
        data: eventData,
    });
    return new workflows_sdk_1.WorkflowResponse(slotDefinitions);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLWJ1bGstc2xvdC1kZWZpbml0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9zbG90LWRlZmluaXRpb25zL3dvcmtmbG93cy9jcmVhdGUtYnVsay1zbG90LWRlZmluaXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBSTBDO0FBQzFDLDREQUEyRDtBQUUzRCxvQ0FBdUQ7QUFnQzFDLFFBQUEsZ0NBQWdDLEdBQUcsSUFBQSw4QkFBYyxFQUM1RDtJQUNFLElBQUksRUFBRSw2QkFBNkI7Q0FDcEMsRUFDRCxVQUFVLEtBQTRDO0lBQ3BELE1BQU0sZUFBZSxHQUFHLElBQUEsb0NBQTRCLEVBQUMsS0FBSyxDQUFDLENBQUE7SUFFM0QsTUFBTSxTQUFTLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdkYsV0FBVyxFQUFFLHNCQUFzQjtRQUNuQyxTQUFTLEVBQUUsS0FBSyxDQUFDLE9BQU87UUFDeEIsU0FBUyxFQUFFLGFBQWE7UUFDeEIsVUFBVSxFQUFFLGVBQWU7UUFDM0IsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLElBQUksSUFBSTtRQUNwQyxRQUFRLEVBQUU7WUFDUixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDdEIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxNQUFNO1lBQzdCLFFBQVEsRUFBRSxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBaUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztTQUMzRDtLQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUgsSUFBQSwwQkFBYSxFQUFDO1FBQ1osU0FBUyxFQUFFLFdBQVc7UUFDdEIsSUFBSSxFQUFFLFNBQVM7S0FDaEIsQ0FBQyxDQUFBO0lBRUYsT0FBTyxJQUFJLGdDQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBQzlDLENBQUMsQ0FDRixDQUFBIn0=