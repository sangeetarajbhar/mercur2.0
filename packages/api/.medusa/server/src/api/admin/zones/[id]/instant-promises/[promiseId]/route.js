"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const instant_promises_1 = require("../../../../../../modules/instant-promises");
const zone_1 = require("../../../../../../modules/zone");
const update_zone_timing_1 = require("../../../../../../workflows/zone/workflows/update-zone-timing");
async function POST(req, res) {
    try {
        const { promiseId, id: zoneId } = req.params;
        const validatedData = req.validatedBody;
        const instantPromiseService = req.scope.resolve(instant_promises_1.INSTANT_PROMISES_MODULE);
        const eventBus = req.scope.resolve(utils_1.Modules.EVENT_BUS);
        const zoneService = req.scope.resolve(zone_1.ZONE_MODULE);
        const oldInstantPromise = await instantPromiseService.retrieveInstantPromises(promiseId);
        const updatedInstantPromise = await instantPromiseService.updateInstantPromises({
            ...validatedData,
            id: promiseId,
            updated_by: req.auth_context.actor_id,
        });
        try {
            const zone = await zoneService.retrieveZones(zoneId);
            if (zone?.location_id) {
                await (0, update_zone_timing_1.updateZoneTimingWorkflow)(req.scope).run({
                    input: {
                        location_id: zone.location_id,
                        updated_by: req.auth_context.actor_id || "system",
                    },
                });
            }
        }
        catch (e) {
            console.warn(`Failed to update zone timing after instant promise update: ${e instanceof Error ? e.message : String(e)}`);
        }
        await eventBus.emit({
            name: "audit.log",
            data: {
                entity_type: "instant_promise",
                entity_id: promiseId,
                operation: "UPDATE",
                old_entity: oldInstantPromise,
                new_entity: updatedInstantPromise,
                changed_by: req.auth_context.actor_id,
                metadata: { zone_id: zoneId },
            },
        });
        res.json({
            message: "Instant promise updated successfully",
            instant_promise: updatedInstantPromise,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to update instant promise",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL1tpZF0vaW5zdGFudC1wcm9taXNlcy9bcHJvbWlzZUlkXS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVFBLG9CQXdEQztBQS9ERCxxREFBbUQ7QUFFbkQsaUZBQW9GO0FBRXBGLHlEQUE0RDtBQUM1RCxzR0FBd0c7QUFFakcsS0FBSyxVQUFVLElBQUksQ0FBQyxHQUErQixFQUFFLEdBQW1CO0lBQzdFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7UUFFNUMsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLGFBQXdDLENBQUE7UUFDbEUsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBOEIsMENBQXVCLENBQUMsQ0FBQTtRQUNyRyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDckQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQW9CLGtCQUFXLENBQUMsQ0FBQTtRQUVyRSxNQUFNLGlCQUFpQixHQUFHLE1BQU0scUJBQXFCLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFeEYsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzlFLEdBQUcsYUFBYTtZQUNoQixFQUFFLEVBQUUsU0FBUztZQUNiLFVBQVUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVE7U0FDdEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDO1lBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3BELElBQUksSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixNQUFNLElBQUEsNkNBQXdCLEVBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDNUMsS0FBSyxFQUFFO3dCQUNMLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVzt3QkFDN0IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxJQUFJLFFBQVE7cUJBQ2xEO2lCQUNGLENBQUMsQ0FBQTtZQUNKLENBQUM7UUFDSCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNYLE9BQU8sQ0FBQyxJQUFJLENBQ1YsOERBQThELENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUMzRyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQztZQUNsQixJQUFJLEVBQUUsV0FBVztZQUNqQixJQUFJLEVBQUU7Z0JBQ0osV0FBVyxFQUFFLGlCQUFpQjtnQkFDOUIsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLFNBQVMsRUFBRSxRQUFRO2dCQUNuQixVQUFVLEVBQUUsaUJBQWlCO2dCQUM3QixVQUFVLEVBQUUscUJBQXFCO2dCQUNqQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRO2dCQUNyQyxRQUFRLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFO2FBQzlCO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNQLE9BQU8sRUFBRSxzQ0FBc0M7WUFDL0MsZUFBZSxFQUFFLHFCQUFxQjtTQUN2QyxDQUFDLENBQUE7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ25CLEtBQUssRUFBRSxrQ0FBa0M7WUFDekMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7U0FDaEUsQ0FBQyxDQUFBO0lBQ0osQ0FBQztBQUNILENBQUMifQ==