"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequestStatusStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
exports.validateRequestStatusStep = (0, workflows_sdk_1.createStep)("validate-request-status", async (input, { container }) => {
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const { data: [entity], } = await query.graph({
        entity: input.alias,
        fields: ["id", "custom_fields.*"],
        filters: { id: input.entity_id },
    });
    if (!entity) {
        throw new utils_1.MedusaError(utils_1.MedusaError.Types.NOT_FOUND, "Request not found");
    }
    const status = entity.custom_fields?.request_status;
    const expected = Array.isArray(input.expected_status)
        ? input.expected_status
        : [input.expected_status];
    if (!expected.includes(status)) {
        throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, `Request status must be ${expected.join(" or ")}, but is ${status}`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGUtcmVxdWVzdC1zdGF0dXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3JlcXVlc3RzL3N0ZXBzL3ZhbGlkYXRlLXJlcXVlc3Qtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUE4RDtBQUM5RCxxREFBa0Y7QUFXckUsUUFBQSx5QkFBeUIsR0FBRyxJQUFBLDBCQUFVLEVBQ2pELHlCQUF5QixFQUN6QixLQUFLLEVBQUUsS0FBcUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUU7SUFDN0QsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBUSxpQ0FBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUV2RSxNQUFNLEVBQ0osSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQ2YsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDcEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxLQUFLO1FBQ25CLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQztRQUNqQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRTtLQUNqQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDWixNQUFNLElBQUksbUJBQVcsQ0FBQyxtQkFBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUksTUFBYyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUE7SUFFNUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO1FBQ25ELENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZTtRQUN2QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFFM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUMvQixNQUFNLElBQUksbUJBQVcsQ0FDbkIsbUJBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUM5QiwwQkFBMEIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxNQUFNLEVBQUUsQ0FDcEUsQ0FBQTtJQUNILENBQUM7QUFDSCxDQUFDLENBQ0YsQ0FBQSJ9