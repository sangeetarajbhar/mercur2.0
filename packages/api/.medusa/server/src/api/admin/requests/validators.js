"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminReviewNote = exports.AdminGetRequestsParams = void 0;
const zod_1 = require("zod");
const validators_1 = require("@medusajs/medusa/api/utils/validators");
const types_1 = require("../../../types");
exports.AdminGetRequestsParams = (0, validators_1.createFindParams)({
    offset: 0,
    limit: 50,
}).extend({
    request_status: zod_1.z
        .union([zod_1.z.nativeEnum(types_1.RequestStatus), zod_1.z.array(zod_1.z.nativeEnum(types_1.RequestStatus))])
        .optional(),
    submitter_id: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    created_at: (0, validators_1.createOperatorMap)().optional(),
    updated_at: (0, validators_1.createOperatorMap)().optional(),
});
exports.AdminReviewNote = zod_1.z.object({
    reviewer_note: zod_1.z.string().optional(),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvYWRtaW4vcmVxdWVzdHMvdmFsaWRhdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBdUI7QUFDdkIsc0VBQTJGO0FBQzNGLDBDQUE4QztBQUdqQyxRQUFBLHNCQUFzQixHQUFHLElBQUEsNkJBQWdCLEVBQUM7SUFDckQsTUFBTSxFQUFFLENBQUM7SUFDVCxLQUFLLEVBQUUsRUFBRTtDQUNWLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDUixjQUFjLEVBQUUsT0FBQztTQUNkLEtBQUssQ0FBQyxDQUFDLE9BQUMsQ0FBQyxVQUFVLENBQUMscUJBQWEsQ0FBQyxFQUFFLE9BQUMsQ0FBQyxLQUFLLENBQUMsT0FBQyxDQUFDLFVBQVUsQ0FBQyxxQkFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFFLFFBQVEsRUFBRTtJQUNiLFlBQVksRUFBRSxPQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQUMsQ0FBQyxLQUFLLENBQUMsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtJQUNuRSxVQUFVLEVBQUUsSUFBQSw4QkFBaUIsR0FBRSxDQUFDLFFBQVEsRUFBRTtJQUMxQyxVQUFVLEVBQUUsSUFBQSw4QkFBaUIsR0FBRSxDQUFDLFFBQVEsRUFBRTtDQUMzQyxDQUFDLENBQUE7QUFHVyxRQUFBLGVBQWUsR0FBRyxPQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3RDLGFBQWEsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQ3JDLENBQUMsQ0FBQSJ9