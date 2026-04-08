"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductTypeRequestWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const workflows_1 = require("@mercurjs/core-plugin/workflows");
const types_1 = require("../../../types");
exports.createProductTypeRequestWorkflow = (0, workflows_sdk_1.createWorkflow)("create-product-type-request", function (input) {
    const productTypes = core_flows_1.createProductTypesWorkflow.runAsStep({
        input: {
            product_types: [input.product_type],
        },
    });
    const upsertInput = (0, workflows_sdk_1.transform)({ productTypes, input }, (data) => ({
        alias: "product_type",
        data: {
            id: data.productTypes[0].id,
            request_status: types_1.RequestStatus.PENDING,
            submitter_id: data.input.submitter_id,
        },
    }));
    (0, workflows_1.upsertCustomFieldsStep)(upsertInput);
    const productType = (0, workflows_sdk_1.transform)({ productTypes }, (data) => data.productTypes[0]);
    return new workflows_sdk_1.WorkflowResponse(productType);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXByb2R1Y3QtdHlwZS1yZXF1ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9yZXF1ZXN0cy93b3JrZmxvd3MvY3JlYXRlLXByb2R1Y3QtdHlwZS1yZXF1ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUErRjtBQUMvRiw0REFBd0U7QUFDeEUsK0RBQXdFO0FBRXhFLDBDQUE4QztBQVVqQyxRQUFBLGdDQUFnQyxHQUFHLElBQUEsOEJBQWMsRUFDNUQsNkJBQTZCLEVBQzdCLFVBQVUsS0FBNEM7SUFDcEQsTUFBTSxZQUFZLEdBQUcsdUNBQTBCLENBQUMsU0FBUyxDQUFDO1FBQ3hELEtBQUssRUFBRTtZQUNMLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUM7U0FDcEM7S0FDRixDQUFDLENBQUE7SUFFRixNQUFNLFdBQVcsR0FBRyxJQUFBLHlCQUFTLEVBQUMsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEUsS0FBSyxFQUFFLGNBQWM7UUFDckIsSUFBSSxFQUFFO1lBQ0osRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFFLENBQUMsRUFBRTtZQUM1QixjQUFjLEVBQUUscUJBQWEsQ0FBQyxPQUFPO1lBQ3JDLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVk7U0FDdEM7S0FDRixDQUFDLENBQUMsQ0FBQTtJQUVILElBQUEsa0NBQXNCLEVBQUMsV0FBVyxDQUFDLENBQUE7SUFFbkMsTUFBTSxXQUFXLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQTtJQUVoRixPQUFPLElBQUksZ0NBQWdCLENBQUMsV0FBVyxDQUFDLENBQUE7QUFDMUMsQ0FBQyxDQUNGLENBQUEifQ==