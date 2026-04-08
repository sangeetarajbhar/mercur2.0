"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorGetProductCategoryRequestsParams = exports.VendorCreateProductCategoryRequest = void 0;
const zod_1 = require("zod");
const validators_1 = require("@medusajs/medusa/api/utils/validators");
const types_1 = require("../../../../types");
exports.VendorCreateProductCategoryRequest = zod_1.z.object({
    name: zod_1.z.string(),
    handle: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    is_internal: zod_1.z.boolean().optional(),
    parent_category_id: zod_1.z.string().nullish(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.VendorGetProductCategoryRequestsParams = (0, validators_1.createFindParams)({
    offset: 0,
    limit: 50,
}).extend({
    q: zod_1.z.string().optional(),
    request_status: zod_1.z
        .union([zod_1.z.nativeEnum(types_1.RequestStatus), zod_1.z.array(zod_1.z.nativeEnum(types_1.RequestStatus))])
        .optional(),
    created_at: (0, validators_1.createOperatorMap)().optional(),
    updated_at: (0, validators_1.createOperatorMap)().optional(),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvdmVuZG9yL3JlcXVlc3RzL3Byb2R1Y3QtY2F0ZWdvcmllcy92YWxpZGF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUF1QjtBQUN2QixzRUFBMkY7QUFDM0YsNkNBQWlEO0FBR3BDLFFBQUEsa0NBQWtDLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUN6RCxJQUFJLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRTtJQUNoQixNQUFNLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM3QixXQUFXLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNsQyxTQUFTLEVBQUUsT0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNqQyxXQUFXLEVBQUUsT0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNuQyxrQkFBa0IsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFO0lBQ3hDLFFBQVEsRUFBRSxPQUFDLENBQUMsTUFBTSxDQUFDLE9BQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRTtDQUMzQyxDQUFDLENBQUE7QUFHVyxRQUFBLHNDQUFzQyxHQUFHLElBQUEsNkJBQWdCLEVBQUM7SUFDckUsTUFBTSxFQUFFLENBQUM7SUFDVCxLQUFLLEVBQUUsRUFBRTtDQUNWLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDUixDQUFDLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUN4QixjQUFjLEVBQUUsT0FBQztTQUNkLEtBQUssQ0FBQyxDQUFDLE9BQUMsQ0FBQyxVQUFVLENBQUMscUJBQWEsQ0FBQyxFQUFFLE9BQUMsQ0FBQyxLQUFLLENBQUMsT0FBQyxDQUFDLFVBQVUsQ0FBQyxxQkFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFFLFFBQVEsRUFBRTtJQUNiLFVBQVUsRUFBRSxJQUFBLDhCQUFpQixHQUFFLENBQUMsUUFBUSxFQUFFO0lBQzFDLFVBQVUsRUFBRSxJQUFBLDhCQUFpQixHQUFFLENBQUMsUUFBUSxFQUFFO0NBQzNDLENBQUMsQ0FBQSJ9