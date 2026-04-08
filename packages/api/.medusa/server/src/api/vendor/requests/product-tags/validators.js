"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorGetProductTagRequestsParams = exports.VendorCreateProductTagRequest = void 0;
const zod_1 = require("zod");
const validators_1 = require("@medusajs/medusa/api/utils/validators");
const types_1 = require("../../../../types");
exports.VendorCreateProductTagRequest = zod_1.z.object({
    value: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.VendorGetProductTagRequestsParams = (0, validators_1.createFindParams)({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvdmVuZG9yL3JlcXVlc3RzL3Byb2R1Y3QtdGFncy92YWxpZGF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUF1QjtBQUN2QixzRUFBMkY7QUFDM0YsNkNBQWlEO0FBR3BDLFFBQUEsNkJBQTZCLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNwRCxLQUFLLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRTtJQUNqQixRQUFRLEVBQUUsT0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUU7Q0FDM0MsQ0FBQyxDQUFBO0FBR1csUUFBQSxpQ0FBaUMsR0FBRyxJQUFBLDZCQUFnQixFQUFDO0lBQ2hFLE1BQU0sRUFBRSxDQUFDO0lBQ1QsS0FBSyxFQUFFLEVBQUU7Q0FDVixDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ1IsQ0FBQyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDeEIsY0FBYyxFQUFFLE9BQUM7U0FDZCxLQUFLLENBQUMsQ0FBQyxPQUFDLENBQUMsVUFBVSxDQUFDLHFCQUFhLENBQUMsRUFBRSxPQUFDLENBQUMsS0FBSyxDQUFDLE9BQUMsQ0FBQyxVQUFVLENBQUMscUJBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMxRSxRQUFRLEVBQUU7SUFDYixVQUFVLEVBQUUsSUFBQSw4QkFBaUIsR0FBRSxDQUFDLFFBQVEsRUFBRTtJQUMxQyxVQUFVLEVBQUUsSUFBQSw4QkFBaUIsR0FBRSxDQUFDLFFBQVEsRUFBRTtDQUMzQyxDQUFDLENBQUEifQ==