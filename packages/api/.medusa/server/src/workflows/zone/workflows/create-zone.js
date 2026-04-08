"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createZoneWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const steps_1 = require("../steps");
exports.createZoneWorkflow = (0, workflows_sdk_1.createWorkflow)({
    name: "create-zone",
}, function (input) {
    const zone = (0, steps_1.createZoneStep)(input);
    const eventData = (0, workflows_sdk_1.transform)({ zone, input }, ({ zone, input }) => ({
        entity_type: "zone",
        entity_id: zone.id,
        operation: "CREATE",
        new_entity: zone,
        changed_by: input.created_by || null,
        metadata: {},
    }));
    (0, core_flows_1.emitEventStep)({
        eventName: "audit.log",
        data: eventData,
    });
    return new workflows_sdk_1.WorkflowResponse(zone);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXpvbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3pvbmUvd29ya2Zsb3dzL2NyZWF0ZS16b25lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUkwQztBQUMxQyw0REFBMkQ7QUFFM0Qsb0NBQXlDO0FBZTVCLFFBQUEsa0JBQWtCLEdBQUcsSUFBQSw4QkFBYyxFQUM5QztJQUNFLElBQUksRUFBRSxhQUFhO0NBQ3BCLEVBQ0QsVUFBVSxLQUE4QjtJQUN0QyxNQUFNLElBQUksR0FBRyxJQUFBLHNCQUFjLEVBQUMsS0FBSyxDQUFDLENBQUE7SUFFbEMsTUFBTSxTQUFTLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakUsV0FBVyxFQUFFLE1BQU07UUFDbkIsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQ2xCLFNBQVMsRUFBRSxRQUFRO1FBQ25CLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUk7UUFDcEMsUUFBUSxFQUFFLEVBQUU7S0FDYixDQUFDLENBQUMsQ0FBQTtJQUVILElBQUEsMEJBQWEsRUFBQztRQUNaLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLElBQUksRUFBRSxTQUFTO0tBQ2hCLENBQUMsQ0FBQTtJQUVGLE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNuQyxDQUFDLENBQ0YsQ0FBQSJ9