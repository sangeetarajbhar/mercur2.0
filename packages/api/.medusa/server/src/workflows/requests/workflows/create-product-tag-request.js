"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductTagRequestWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const workflows_1 = require("@mercurjs/core-plugin/workflows");
const types_1 = require("../../../types");
exports.createProductTagRequestWorkflow = (0, workflows_sdk_1.createWorkflow)("create-product-tag-request", function (input) {
    const productTags = core_flows_1.createProductTagsWorkflow.runAsStep({
        input: {
            product_tags: [input.product_tag],
        },
    });
    const upsertInput = (0, workflows_sdk_1.transform)({ productTags, input }, (data) => ({
        alias: "product_tag",
        data: {
            id: data.productTags[0].id,
            request_status: types_1.RequestStatus.PENDING,
            submitter_id: data.input.submitter_id,
        },
    }));
    (0, workflows_1.upsertCustomFieldsStep)(upsertInput);
    const productTag = (0, workflows_sdk_1.transform)({ productTags }, (data) => data.productTags[0]);
    return new workflows_sdk_1.WorkflowResponse(productTag);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXByb2R1Y3QtdGFnLXJlcXVlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3JlcXVlc3RzL3dvcmtmbG93cy9jcmVhdGUtcHJvZHVjdC10YWctcmVxdWVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBK0Y7QUFDL0YsNERBQXVFO0FBQ3ZFLCtEQUF3RTtBQUV4RSwwQ0FBOEM7QUFVakMsUUFBQSwrQkFBK0IsR0FBRyxJQUFBLDhCQUFjLEVBQzNELDRCQUE0QixFQUM1QixVQUFVLEtBQTJDO0lBQ25ELE1BQU0sV0FBVyxHQUFHLHNDQUF5QixDQUFDLFNBQVMsQ0FBQztRQUN0RCxLQUFLLEVBQUU7WUFDTCxZQUFZLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO1NBQ2xDO0tBQ0YsQ0FBQyxDQUFBO0lBRUYsTUFBTSxXQUFXLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELEtBQUssRUFBRSxhQUFhO1FBQ3BCLElBQUksRUFBRTtZQUNKLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBRSxDQUFDLEVBQUU7WUFDM0IsY0FBYyxFQUFFLHFCQUFhLENBQUMsT0FBTztZQUNyQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZO1NBQ3RDO0tBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFSCxJQUFBLGtDQUFzQixFQUFDLFdBQVcsQ0FBQyxDQUFBO0lBRW5DLE1BQU0sVUFBVSxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUE7SUFFN0UsT0FBTyxJQUFJLGdDQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQ3pDLENBQUMsQ0FDRixDQUFBIn0=