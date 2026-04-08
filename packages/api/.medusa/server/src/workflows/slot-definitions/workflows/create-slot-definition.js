"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSlotDefinitionWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const steps_1 = require("../steps");
exports.createSlotDefinitionWorkflow = (0, workflows_sdk_1.createWorkflow)({
    name: "create-slot-definition",
}, function (input) {
    const slotDefinition = (0, steps_1.createSlotDefinitionStep)(input);
    const eventData = (0, workflows_sdk_1.transform)({ slotDefinition, input }, ({ slotDefinition, input }) => ({
        entity_type: "slot_definition",
        entity_id: slotDefinition.id,
        operation: "CREATE",
        new_entity: slotDefinition,
        changed_by: input.created_by || null,
        metadata: { zone_id: input.zone_id },
    }));
    (0, core_flows_1.emitEventStep)({
        eventName: "audit.log",
        data: eventData,
    });
    return new workflows_sdk_1.WorkflowResponse(slotDefinition);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXNsb3QtZGVmaW5pdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3Mvc2xvdC1kZWZpbml0aW9ucy93b3JrZmxvd3MvY3JlYXRlLXNsb3QtZGVmaW5pdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFJMEM7QUFDMUMsNERBQTJEO0FBRTNELG9DQUFtRDtBQThCdEMsUUFBQSw0QkFBNEIsR0FBRyxJQUFBLDhCQUFjLEVBQ3hEO0lBQ0UsSUFBSSxFQUFFLHdCQUF3QjtDQUMvQixFQUNELFVBQVUsS0FBd0M7SUFDaEQsTUFBTSxjQUFjLEdBQUcsSUFBQSxnQ0FBd0IsRUFBQyxLQUFLLENBQUMsQ0FBQTtJQUV0RCxNQUFNLFNBQVMsR0FBRyxJQUFBLHlCQUFTLEVBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRixXQUFXLEVBQUUsaUJBQWlCO1FBQzlCLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRTtRQUM1QixTQUFTLEVBQUUsUUFBUTtRQUNuQixVQUFVLEVBQUUsY0FBYztRQUMxQixVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxJQUFJO1FBQ3BDLFFBQVEsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFO0tBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBRUgsSUFBQSwwQkFBYSxFQUFDO1FBQ1osU0FBUyxFQUFFLFdBQVc7UUFDdEIsSUFBSSxFQUFFLFNBQVM7S0FDaEIsQ0FBQyxDQUFBO0lBRUYsT0FBTyxJQUFJLGdDQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQzdDLENBQUMsQ0FDRixDQUFBIn0=