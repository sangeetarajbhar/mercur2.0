"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorGetProductTypeRequestsParams = exports.VendorCreateProductTypeRequest = void 0;
const zod_1 = require("zod");
const validators_1 = require("@medusajs/medusa/api/utils/validators");
const types_1 = require("../../../../types");
exports.VendorCreateProductTypeRequest = zod_1.z.object({
    value: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.VendorGetProductTypeRequestsParams = (0, validators_1.createFindParams)({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvdmVuZG9yL3JlcXVlc3RzL3Byb2R1Y3QtdHlwZXMvdmFsaWRhdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBdUI7QUFDdkIsc0VBQTJGO0FBQzNGLDZDQUFpRDtBQUdwQyxRQUFBLDhCQUE4QixHQUFHLE9BQUMsQ0FBQyxNQUFNLENBQUM7SUFDckQsS0FBSyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUU7SUFDakIsUUFBUSxFQUFFLE9BQUMsQ0FBQyxNQUFNLENBQUMsT0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFO0NBQzNDLENBQUMsQ0FBQTtBQUdXLFFBQUEsa0NBQWtDLEdBQUcsSUFBQSw2QkFBZ0IsRUFBQztJQUNqRSxNQUFNLEVBQUUsQ0FBQztJQUNULEtBQUssRUFBRSxFQUFFO0NBQ1YsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNSLENBQUMsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3hCLGNBQWMsRUFBRSxPQUFDO1NBQ2QsS0FBSyxDQUFDLENBQUMsT0FBQyxDQUFDLFVBQVUsQ0FBQyxxQkFBYSxDQUFDLEVBQUUsT0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFDLENBQUMsVUFBVSxDQUFDLHFCQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDMUUsUUFBUSxFQUFFO0lBQ2IsVUFBVSxFQUFFLElBQUEsOEJBQWlCLEdBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDMUMsVUFBVSxFQUFFLElBQUEsOEJBQWlCLEdBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDM0MsQ0FBQyxDQUFBIn0=