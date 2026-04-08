"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateZoneWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const steps_1 = require("../steps");
exports.updateZoneWorkflow = (0, workflows_sdk_1.createWorkflow)({
    name: "update-zone",
}, function (input) {
    const { oldZone, updatedZone } = (0, steps_1.updateZoneStep)(input);
    const eventData = (0, workflows_sdk_1.transform)({ oldZone, updatedZone, input }, ({ oldZone, updatedZone, input }) => ({
        entity_type: "zone",
        entity_id: input.zone_id,
        operation: "UPDATE",
        old_entity: oldZone,
        new_entity: updatedZone,
        changed_by: input.updated_by || null,
        metadata: {},
    }));
    (0, core_flows_1.emitEventStep)({
        eventName: "audit.log",
        data: eventData,
    });
    return new workflows_sdk_1.WorkflowResponse(updatedZone);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXpvbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3pvbmUvd29ya2Zsb3dzL3VwZGF0ZS16b25lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUkwQztBQUMxQyw0REFBMkQ7QUFFM0Qsb0NBQXlDO0FBZTVCLFFBQUEsa0JBQWtCLEdBQUcsSUFBQSw4QkFBYyxFQUM5QztJQUNFLElBQUksRUFBRSxhQUFhO0NBQ3BCLEVBQ0QsVUFBVSxLQUE4QjtJQUN0QyxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUEsc0JBQWMsRUFBQyxLQUFLLENBQUMsQ0FBQTtJQUV0RCxNQUFNLFNBQVMsR0FBRyxJQUFBLHlCQUFTLEVBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pHLFdBQVcsRUFBRSxNQUFNO1FBQ25CLFNBQVMsRUFBRSxLQUFLLENBQUMsT0FBTztRQUN4QixTQUFTLEVBQUUsUUFBUTtRQUNuQixVQUFVLEVBQUUsT0FBTztRQUNuQixVQUFVLEVBQUUsV0FBVztRQUN2QixVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxJQUFJO1FBQ3BDLFFBQVEsRUFBRSxFQUFFO0tBQ2IsQ0FBQyxDQUFDLENBQUE7SUFFSCxJQUFBLDBCQUFhLEVBQUM7UUFDWixTQUFTLEVBQUUsV0FBVztRQUN0QixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDLENBQUE7SUFFRixPQUFPLElBQUksZ0NBQWdCLENBQUMsV0FBOEIsQ0FBQyxDQUFBO0FBQzdELENBQUMsQ0FDRixDQUFBIn0=