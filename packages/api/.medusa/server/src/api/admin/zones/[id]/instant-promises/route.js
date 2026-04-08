"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const instant_promises_1 = require("../../../../../modules/instant-promises");
const zone_1 = require("../../../../../modules/zone");
const update_zone_timing_1 = require("../../../../../workflows/zone/workflows/update-zone-timing");
async function GET(req, res) {
    try {
        const { id: zoneId } = req.params;
        const instantPromiseService = req.scope.resolve(instant_promises_1.INSTANT_PROMISES_MODULE);
        const instantPromises = await instantPromiseService.listInstantPromises({
            zone_id: zoneId,
        });
        res.json({
            instant_promises: instantPromises,
            count: instantPromises.length,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to fetch instant promises",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
async function POST(req, res) {
    try {
        const { id: zoneId } = req.params;
        const validatedData = req.validatedBody;
        const instantPromiseService = req.scope.resolve(instant_promises_1.INSTANT_PROMISES_MODULE);
        const eventBus = req.scope.resolve(utils_1.Modules.EVENT_BUS);
        const zoneService = req.scope.resolve(zone_1.ZONE_MODULE);
        const createPayload = {
            zone_id: zoneId,
            promise_text: validatedData.promise_text,
            promise_minutes: validatedData.promise_minutes,
            pickup_lead_minutes: validatedData.pickup_lead_minutes,
            return_lead_minutes: validatedData.return_lead_minutes,
            is_active: validatedData.is_active ?? true,
            metadata: validatedData.metadata || {},
            created_by: req.auth_context.actor_id,
        };
        const instantPromise = await instantPromiseService.createInstantPromises(createPayload);
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
            console.warn(`Failed to update zone timing after instant promise create: ${e instanceof Error ? e.message : String(e)}`);
        }
        await eventBus.emit({
            name: "audit.log",
            data: {
                entity_type: "instant_promise",
                entity_id: instantPromise.id,
                operation: "CREATE",
                new_entity: instantPromise,
                changed_by: req.auth_context.actor_id,
                metadata: { zone_id: zoneId },
            },
        });
        res.status(201).json({
            message: "Instant promise created successfully",
            instant_promise: instantPromise,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to create instant promise",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL1tpZF0vaW5zdGFudC1wcm9taXNlcy9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVFBLGtCQW1CQztBQUVELG9CQTREQztBQXhGRCxxREFBbUQ7QUFFbkQsOEVBQWlGO0FBRWpGLHNEQUF5RDtBQUN6RCxtR0FBcUc7QUFFOUYsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUErQixFQUFFLEdBQW1CO0lBQzVFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQTtRQUNqQyxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUE4QiwwQ0FBdUIsQ0FBQyxDQUFBO1FBRXJHLE1BQU0sZUFBZSxHQUFHLE1BQU0scUJBQXFCLENBQUMsbUJBQW1CLENBQUM7WUFDdEUsT0FBTyxFQUFFLE1BQU07U0FDaEIsQ0FBQyxDQUFBO1FBRUYsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNQLGdCQUFnQixFQUFFLGVBQWU7WUFDakMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxNQUFNO1NBQzlCLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbkIsS0FBSyxFQUFFLGtDQUFrQztZQUN6QyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUNoRSxDQUFDLENBQUE7SUFDSixDQUFDO0FBQ0gsQ0FBQztBQUVNLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBK0IsRUFBRSxHQUFtQjtJQUM3RSxJQUFJ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