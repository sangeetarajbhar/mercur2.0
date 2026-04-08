"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductCategoryRequestWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const workflows_1 = require("@mercurjs/core-plugin/workflows");
const types_1 = require("../../../types");
exports.createProductCategoryRequestWorkflow = (0, workflows_sdk_1.createWorkflow)("create-product-category-request", function (input) {
    const categories = core_flows_1.createProductCategoriesWorkflow.runAsStep({
        input: {
            product_categories: [input.product_category],
        },
    });
    const upsertInput = (0, workflows_sdk_1.transform)({ categories, input }, (data) => ({
        alias: "product_category",
        data: {
            id: data.categories[0].id,
            request_status: types_1.RequestStatus.PENDING,
            submitter_id: data.input.submitter_id,
        },
    }));
    (0, workflows_1.upsertCustomFieldsStep)(upsertInput);
    const category = (0, workflows_sdk_1.transform)({ categories }, (data) => data.categories[0]);
    return new workflows_sdk_1.WorkflowResponse(category);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXByb2R1Y3QtY2F0ZWdvcnktcmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3MvcmVxdWVzdHMvd29ya2Zsb3dzL2NyZWF0ZS1wcm9kdWN0LWNhdGVnb3J5LXJlcXVlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBQStGO0FBQy9GLDREQUE2RTtBQUM3RSwrREFBd0U7QUFFeEUsMENBQThDO0FBZWpDLFFBQUEsb0NBQW9DLEdBQUcsSUFBQSw4QkFBYyxFQUNoRSxpQ0FBaUMsRUFDakMsVUFBVSxLQUFnRDtJQUN4RCxNQUFNLFVBQVUsR0FBRyw0Q0FBK0IsQ0FBQyxTQUFTLENBQUM7UUFDM0QsS0FBSyxFQUFFO1lBQ0wsa0JBQWtCLEVBQUUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7U0FDN0M7S0FDRixDQUFDLENBQUE7SUFFRixNQUFNLFdBQVcsR0FBRyxJQUFBLHlCQUFTLEVBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUQsS0FBSyxFQUFFLGtCQUFrQjtRQUN6QixJQUFJLEVBQUU7WUFDSixFQUFFLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxFQUFFO1lBQzFCLGNBQWMsRUFBRSxxQkFBYSxDQUFDLE9BQU87WUFDckMsWUFBWSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWTtTQUN0QztLQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUgsSUFBQSxrQ0FBc0IsRUFBQyxXQUFXLENBQUMsQ0FBQTtJQUVuQyxNQUFNLFFBQVEsR0FBRyxJQUFBLHlCQUFTLEVBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFBO0lBRXpFLE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUN2QyxDQUFDLENBQ0YsQ0FBQSJ9