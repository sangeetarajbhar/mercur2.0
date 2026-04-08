"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlsRoutesMiddlewares = void 0;
const framework_1 = require("@medusajs/framework");
const validators_1 = require("./validators");
const search_middleware_1 = require("./search.middleware");
exports.controlsRoutesMiddlewares = [
    {
        method: ["GET"],
        matcher: "/admin/controls",
        middlewares: [
            (0, framework_1.validateAndTransformQuery)(validators_1.AdminGetControlsParams, {
                defaults: ["limit", "offset", "scope", "q"],
                isList: true,
            }),
            search_middleware_1.searchMiddleware,
        ],
    },
    {
        method: ["POST"],
        matcher: "/admin/controls",
        middlewares: [
            (0, framework_1.validateAndTransformBody)(validators_1.AdminCreateControl),
        ],
    },
    {
        method: ["GET"],
        matcher: "/admin/controls/:id",
        middlewares: [],
    },
    {
        method: ["POST"],
        matcher: "/admin/controls/:id",
        middlewares: [
            (0, framework_1.validateAndTransformBody)(validators_1.AdminUpdateControl),
        ],
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2NvbnRyb2xzL21pZGRsZXdhcmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1EQUc0QjtBQUM1Qiw2Q0FBNkY7QUFDN0YsMkRBQXNEO0FBRXpDLFFBQUEseUJBQXlCLEdBQXNCO0lBQzFEO1FBQ0UsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2YsT0FBTyxFQUFFLGlCQUFpQjtRQUMxQixXQUFXLEVBQUU7WUFDWCxJQUFBLHFDQUF5QixFQUFDLG1DQUFzQixFQUFFO2dCQUNoRCxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUM7Z0JBQzNDLE1BQU0sRUFBRSxJQUFJO2FBQ2IsQ0FBQztZQUNGLG9DQUFnQjtTQUNqQjtLQUNGO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDaEIsT0FBTyxFQUFFLGlCQUFpQjtRQUMxQixXQUFXLEVBQUU7WUFDWCxJQUFBLG9DQUF3QixFQUFDLCtCQUFrQixDQUFDO1NBQzdDO0tBQ0Y7SUFDRDtRQUNFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNmLE9BQU8sRUFBRSxxQkFBcUI7UUFDOUIsV0FBVyxFQUFFLEVBQUU7S0FDaEI7SUFDRDtRQUNFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNoQixPQUFPLEVBQUUscUJBQXFCO1FBQzlCLFdBQVcsRUFBRTtZQUNYLElBQUEsb0NBQXdCLEVBQUMsK0JBQWtCLENBQUM7U0FDN0M7S0FDRjtDQUNGLENBQUEifQ==