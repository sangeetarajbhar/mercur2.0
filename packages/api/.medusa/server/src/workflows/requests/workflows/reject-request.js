"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectRequestWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const workflows_1 = require("@mercurjs/core-plugin/workflows");
const types_1 = require("../../../types");
const steps_1 = require("../steps");
exports.rejectRequestWorkflow = (0, workflows_sdk_1.createWorkflow)("reject-request", (input) => {
    (0, steps_1.validateRequestStatusStep)({
        alias: input.alias,
        entity_id: input.entity_id,
        expected_status: types_1.RequestStatus.PENDING,
    });
    const result = (0, workflows_1.upsertCustomFieldsStep)({
        alias: input.alias,
        data: {
            id: input.entity_id,
            request_status: types_1.RequestStatus.REJECTED,
            reviewer_id: input.reviewer_id,
            reviewer_note: input.reviewer_note ?? null,
        },
    });
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVqZWN0LXJlcXVlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3JlcXVlc3RzL3dvcmtmbG93cy9yZWplY3QtcmVxdWVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBb0Y7QUFDcEYsK0RBQXdFO0FBRXhFLDBDQUE4QztBQUM5QyxvQ0FBb0Q7QUFTdkMsUUFBQSxxQkFBcUIsR0FBRyxJQUFBLDhCQUFjLEVBQ2pELGdCQUFnQixFQUNoQixDQUFDLEtBQWlDLEVBQUUsRUFBRTtJQUNwQyxJQUFBLGlDQUF5QixFQUFDO1FBQ3hCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztRQUNsQixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7UUFDMUIsZUFBZSxFQUFFLHFCQUFhLENBQUMsT0FBTztLQUN2QyxDQUFDLENBQUE7SUFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLGtDQUFzQixFQUFDO1FBQ3BDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztRQUNsQixJQUFJLEVBQUU7WUFDSixFQUFFLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDbkIsY0FBYyxFQUFFLHFCQUFhLENBQUMsUUFBUTtZQUN0QyxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhLElBQUksSUFBSTtTQUMzQztLQUNGLENBQUMsQ0FBQTtJQUVGLE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUNyQyxDQUFDLENBQ0YsQ0FBQSJ9