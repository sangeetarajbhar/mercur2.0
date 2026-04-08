"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRequestsMiddlewares = void 0;
const framework_1 = require("@medusajs/framework");
const query_config_1 = require("./query-config");
const validators_1 = require("./validators");
exports.adminRequestsMiddlewares = [
    {
        method: ["GET"],
        matcher: "/admin/requests/:type",
        middlewares: [
            (0, framework_1.validateAndTransformQuery)(validators_1.AdminGetRequestsParams, query_config_1.adminRequestQueryConfig.list),
        ],
    },
    {
        method: ["GET"],
        matcher: "/admin/requests/:type/:id",
        middlewares: [
            (0, framework_1.validateAndTransformQuery)(validators_1.AdminGetRequestsParams, query_config_1.adminRequestQueryConfig.retrieve),
        ],
    },
    {
        method: ["POST"],
        matcher: "/admin/requests/:type/:id/accept",
        middlewares: [
            (0, framework_1.validateAndTransformBody)(validators_1.AdminReviewNote),
        ],
    },
    {
        method: ["POST"],
        matcher: "/admin/requests/:type/:id/reject",
        middlewares: [
            (0, framework_1.validateAndTransformBody)(validators_1.AdminReviewNote),
        ],
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3JlcXVlc3RzL21pZGRsZXdhcmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUc0QjtBQUc1QixpREFBd0Q7QUFDeEQsNkNBQXNFO0FBRXpELFFBQUEsd0JBQXdCLEdBQXNCO0lBQ3pEO1FBQ0UsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2YsT0FBTyxFQUFFLHVCQUF1QjtRQUNoQyxXQUFXLEVBQUU7WUFDWCxJQUFBLHFDQUF5QixFQUN2QixtQ0FBc0IsRUFDdEIsc0NBQXVCLENBQUMsSUFBSSxDQUM3QjtTQUNGO0tBQ0Y7SUFDRDtRQUNFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNmLE9BQU8sRUFBRSwyQkFBMkI7UUFDcEMsV0FBVyxFQUFFO1lBQ1gsSUFBQSxxQ0FBeUIsRUFDdkIsbUNBQXNCLEVBQ3RCLHNDQUF1QixDQUFDLFFBQVEsQ0FDakM7U0FDRjtLQUNGO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDaEIsT0FBTyxFQUFFLGtDQUFrQztRQUMzQyxXQUFXLEVBQUU7WUFDWCxJQUFBLG9DQUF3QixFQUFDLDRCQUFlLENBQUM7U0FDMUM7S0FDRjtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ2hCLE9BQU8sRUFBRSxrQ0FBa0M7UUFDM0MsV0FBVyxFQUFFO1lBQ1gsSUFBQSxvQ0FBd0IsRUFBQyw0QkFBZSxDQUFDO1NBQzFDO0tBQ0Y7Q0FDRixDQUFBIn0=