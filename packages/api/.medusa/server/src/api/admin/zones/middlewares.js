"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zonesRoutesMiddlewares = void 0;
const framework_1 = require("@medusajs/framework");
const validators_1 = require("./validators");
const validators_2 = require("./validators");
const slot_override_validation_1 = require("./validation/slot-override-validation");
const zone_validation_1 = require("./validation/zone-validation");
exports.zonesRoutesMiddlewares = [
    {
        method: ["GET"],
        matcher: "/admin/zones",
        middlewares: [
            (0, framework_1.validateAndTransformQuery)(validators_1.AdminGetZonesParams, {
                defaults: ["limit", "offset", "q"],
                isList: true,
            }),
        ],
    },
    {
        method: ["POST"],
        matcher: "/admin/zones",
        middlewares: [(0, framework_1.validateAndTransformBody)(validators_1.AdminCreateZone), zone_validation_1.validateUniquePostcodesMiddleware],
    },
    {
        method: ["GET"],
        matcher: "/admin/zones/:id",
        middlewares: [],
    },
    {
        method: ["POST"],
        matcher: "/admin/zones/:id",
        middlewares: [(0, framework_1.validateAndTransformBody)(validators_1.AdminUpdateZone), zone_validation_1.validateUniquePostcodesMiddleware],
    },
    {
        method: ["GET"],
        matcher: "/admin/zones/:id/slot-definitions",
        middlewares: [],
    },
    {
        method: ["POST"],
        matcher: "/admin/zones/:id/slot-definitions",
        middlewares: [zone_validation_1.validateSlotDefinitionMiddleware],
    },
    {
        method: ["POST"],
        matcher: "/admin/zones/:id/slot-definitions/:slotId",
        middlewares: [(0, framework_1.validateAndTransformBody)(validators_2.UpdateSlotDefinitionSchema)],
    },
    {
        method: ["GET"],
        matcher: "/admin/zones/:id/instant-promises",
        middlewares: [],
    },
    {
        method: ["POST"],
        matcher: "/admin/zones/:id/instant-promises",
        middlewares: [(0, framework_1.validateAndTransformBody)(validators_2.CreateInstantPromiseSchema)],
    },
    {
        method: ["POST"],
        matcher: "/admin/zones/:id/instant-promises/:promiseId",
        middlewares: [(0, framework_1.validateAndTransformBody)(validators_2.UpdateInstantPromiseSchema)],
    },
    {
        method: ["GET"],
        matcher: "/admin/zones/:id/slot-overrides",
        middlewares: [],
    },
    {
        method: ["POST"],
        matcher: "/admin/zones/:id/slot-overrides",
        middlewares: [(0, framework_1.validateAndTransformBody)(slot_override_validation_1.CreateSlotOverrideSchema)],
    },
    {
        method: ["GET"],
        matcher: "/admin/zones/:id/slot-overrides/:overrideId",
        middlewares: [],
    },
    {
        method: ["POST"],
        matcher: "/admin/zones/:id/slot-overrides/:overrideId",
        middlewares: [(0, framework_1.validateAndTransformBody)(slot_override_validation_1.UpdateSlotOverrideSchema)],
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL21pZGRsZXdhcmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1EQUc0QjtBQUM1Qiw2Q0FBb0Y7QUFDcEYsNkNBQWlIO0FBQ2pILG9GQUEwRztBQUMxRyxrRUFBa0g7QUFFckcsUUFBQSxzQkFBc0IsR0FBc0I7SUFDdkQ7UUFDRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDZixPQUFPLEVBQUUsY0FBYztRQUN2QixXQUFXLEVBQUU7WUFDWCxJQUFBLHFDQUF5QixFQUFDLGdDQUFtQixFQUFFO2dCQUM3QyxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQztnQkFDbEMsTUFBTSxFQUFFLElBQUk7YUFDYixDQUFDO1NBQ0g7S0FDRjtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ2hCLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLFdBQVcsRUFBRSxDQUFDLElBQUEsb0NBQXdCLEVBQUMsNEJBQWUsQ0FBQyxFQUFFLG1EQUFpQyxDQUFDO0tBQzVGO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDZixPQUFPLEVBQUUsa0JBQWtCO1FBQzNCLFdBQVcsRUFBRSxFQUFFO0tBQ2hCO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDaEIsT0FBTyxFQUFFLGtCQUFrQjtRQUMzQixXQUFXLEVBQUUsQ0FBQyxJQUFBLG9DQUF3QixFQUFDLDRCQUFlLENBQUMsRUFBRSxtREFBaUMsQ0FBQztLQUM1RjtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2YsT0FBTyxFQUFFLG1DQUFtQztRQUM1QyxXQUFXLEVBQUUsRUFBRTtLQUNoQjtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ2hCLE9BQU8sRUFBRSxtQ0FBbUM7UUFDNUMsV0FBVyxFQUFFLENBQUMsa0RBQWdDLENBQUM7S0FDaEQ7SUFDRDtRQUNFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNoQixPQUFPLEVBQUUsMkNBQTJDO1FBQ3BELFdBQVcsRUFBRSxDQUFDLElBQUEsb0NBQXdCLEVBQUMsdUNBQTBCLENBQUMsQ0FBQztLQUNwRTtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2YsT0FBTyxFQUFFLG1DQUFtQztRQUM1QyxXQUFXLEVBQUUsRUFBRTtLQUNoQjtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ2hCLE9BQU8sRUFBRSxtQ0FBbUM7UUFDNUMsV0FBVyxFQUFFLENBQUMsSUFBQSxvQ0FBd0IsRUFBQyx1Q0FBMEIsQ0FBQyxDQUFDO0tBQ3BFO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDaEIsT0FBTyxFQUFFLDhDQUE4QztRQUN2RCxXQUFXLEVBQUUsQ0FBQyxJQUFBLG9DQUF3QixFQUFDLHVDQUEwQixDQUFDLENBQUM7S0FDcEU7SUFDRDtRQUNFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNmLE9BQU8sRUFBRSxpQ0FBaUM7UUFDMUMsV0FBVyxFQUFFLEVBQUU7S0FDaEI7SUFDRDtRQUNFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNoQixPQUFPLEVBQUUsaUNBQWlDO1FBQzFDLFdBQVcsRUFBRSxDQUFDLElBQUEsb0NBQXdCLEVBQUMsbURBQXdCLENBQUMsQ0FBQztLQUNsRTtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2YsT0FBTyxFQUFFLDZDQUE2QztRQUN0RCxXQUFXLEVBQUUsRUFBRTtLQUNoQjtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ2hCLE9BQU8sRUFBRSw2Q0FBNkM7UUFDdEQsV0FBVyxFQUFFLENBQUMsSUFBQSxvQ0FBd0IsRUFBQyxtREFBd0IsQ0FBQyxDQUFDO0tBQ2xFO0NBQ0YsQ0FBQSJ9