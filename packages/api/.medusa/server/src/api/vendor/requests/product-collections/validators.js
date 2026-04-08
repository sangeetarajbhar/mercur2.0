"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorGetProductCollectionRequestsParams = exports.VendorCreateProductCollectionRequest = void 0;
const zod_1 = require("zod");
const validators_1 = require("@medusajs/medusa/api/utils/validators");
const types_1 = require("../../../../types");
exports.VendorCreateProductCollectionRequest = zod_1.z.object({
    title: zod_1.z.string(),
    handle: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.VendorGetProductCollectionRequestsParams = (0, validators_1.createFindParams)({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvdmVuZG9yL3JlcXVlc3RzL3Byb2R1Y3QtY29sbGVjdGlvbnMvdmFsaWRhdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBdUI7QUFDdkIsc0VBQTJGO0FBQzNGLDZDQUFpRDtBQUdwQyxRQUFBLG9DQUFvQyxHQUFHLE9BQUMsQ0FBQyxNQUFNLENBQUM7SUFDM0QsS0FBSyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUU7SUFDakIsTUFBTSxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDN0IsUUFBUSxFQUFFLE9BQUMsQ0FBQyxNQUFNLENBQUMsT0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFO0NBQzNDLENBQUMsQ0FBQTtBQUdXLFFBQUEsd0NBQXdDLEdBQUcsSUFBQSw2QkFBZ0IsRUFBQztJQUN2RSxNQUFNLEVBQUUsQ0FBQztJQUNULEtBQUssRUFBRSxFQUFFO0NBQ1YsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNSLENBQUMsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3hCLGNBQWMsRUFBRSxPQUFDO1NBQ2QsS0FBSyxDQUFDLENBQUMsT0FBQyxDQUFDLFVBQVUsQ0FBQyxxQkFBYSxDQUFDLEVBQUUsT0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFDLENBQUMsVUFBVSxDQUFDLHFCQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDMUUsUUFBUSxFQUFFO0lBQ2IsVUFBVSxFQUFFLElBQUEsOEJBQWlCLEdBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDMUMsVUFBVSxFQUFFLElBQUEsOEJBQWlCLEdBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDM0MsQ0FBQyxDQUFBIn0=