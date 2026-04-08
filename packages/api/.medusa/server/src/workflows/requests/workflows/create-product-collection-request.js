"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductCollectionRequestWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const workflows_1 = require("@mercurjs/core-plugin/workflows");
const types_1 = require("../../../types");
exports.createProductCollectionRequestWorkflow = (0, workflows_sdk_1.createWorkflow)("create-product-collection-request", function (input) {
    const collections = core_flows_1.createCollectionsWorkflow.runAsStep({
        input: {
            collections: [input.product_collection],
        },
    });
    const upsertInput = (0, workflows_sdk_1.transform)({ collections, input }, (data) => ({
        alias: "product_collection",
        data: {
            id: data.collections[0].id,
            request_status: types_1.RequestStatus.PENDING,
            submitter_id: data.input.submitter_id,
        },
    }));
    (0, workflows_1.upsertCustomFieldsStep)(upsertInput);
    const collection = (0, workflows_sdk_1.transform)({ collections }, (data) => data.collections[0]);
    return new workflows_sdk_1.WorkflowResponse(collection);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXByb2R1Y3QtY29sbGVjdGlvbi1yZXF1ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9yZXF1ZXN0cy93b3JrZmxvd3MvY3JlYXRlLXByb2R1Y3QtY29sbGVjdGlvbi1yZXF1ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUErRjtBQUMvRiw0REFBdUU7QUFDdkUsK0RBQXdFO0FBRXhFLDBDQUE4QztBQVdqQyxRQUFBLHNDQUFzQyxHQUFHLElBQUEsOEJBQWMsRUFDbEUsbUNBQW1DLEVBQ25DLFVBQVUsS0FBa0Q7SUFDMUQsTUFBTSxXQUFXLEdBQUcsc0NBQXlCLENBQUMsU0FBUyxDQUFDO1FBQ3RELEtBQUssRUFBRTtZQUNMLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQztTQUN4QztLQUNGLENBQUMsQ0FBQTtJQUVGLE1BQU0sV0FBVyxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvRCxLQUFLLEVBQUUsb0JBQW9CO1FBQzNCLElBQUksRUFBRTtZQUNKLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBRSxDQUFDLEVBQUU7WUFDM0IsY0FBYyxFQUFFLHFCQUFhLENBQUMsT0FBTztZQUNyQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZO1NBQ3RDO0tBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFSCxJQUFBLGtDQUFzQixFQUFDLFdBQVcsQ0FBQyxDQUFBO0lBRW5DLE1BQU0sVUFBVSxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUE7SUFFN0UsT0FBTyxJQUFJLGdDQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQ3pDLENBQUMsQ0FDRixDQUFBIn0=