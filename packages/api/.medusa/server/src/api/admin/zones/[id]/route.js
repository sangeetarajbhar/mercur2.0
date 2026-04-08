"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const update_zone_1 = require("../../../../workflows/zone/workflows/update-zone");
async function GET(req, res) {
    try {
        const { id } = req.params;
        const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
        const { data: zones } = await query.graph({
            entity: "zone",
            fields: ["*"],
            filters: { id },
        });
        if (!zones || zones.length === 0) {
            return res.status(404).json({
                error: "Zone not found",
            });
        }
        const zone = zones[0];
        const { data: instantPromises } = await query.graph({
            entity: "instant_promise",
            fields: ["*"],
            filters: { zone_id: id },
        });
        const zoneWithPromises = {
            ...zone,
            instant_promises: instantPromises || [],
        };
        res.json({ zone: zoneWithPromises });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to fetch zone",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
async function POST(req, res) {
    try {
        const { id } = req.params;
        const body = req.validatedBody;
        const workflowInput = {
            ...body,
            zone_id: id,
            updated_by: req.auth_context.actor_id,
        };
        const { result } = await (0, update_zone_1.updateZoneWorkflow)(req.scope).run({
            input: workflowInput,
        });
        res.json({
            message: "Zone updated successfully",
            zone: result,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to update zone",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL1tpZF0vcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFJQSxrQkFxQ0M7QUFFRCxvQkF3QkM7QUFsRUQscURBQXFFO0FBQ3JFLGtGQUE4RztBQUV2RyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQStCLEVBQUUsR0FBbUI7SUFDNUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7UUFDekIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFaEUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDeEMsTUFBTSxFQUFFLE1BQU07WUFDZCxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDYixPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUU7U0FDaEIsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLEtBQUssRUFBRSxnQkFBZ0I7YUFDeEIsQ0FBQyxDQUFBO1FBQ0osQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyQixNQUFNLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztZQUNsRCxNQUFNLEVBQUUsaUJBQWlCO1lBQ3pCLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUNiLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7U0FDekIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxnQkFBZ0IsR0FBRztZQUN2QixHQUFHLElBQUk7WUFDUCxnQkFBZ0IsRUFBRSxlQUFlLElBQUksRUFBRTtTQUN4QyxDQUFBO1FBRUQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuQixLQUFLLEVBQUUsc0JBQXNCO1lBQzdCLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQ2hFLENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLElBQUksQ0FBQyxHQUErQixFQUFFLEdBQW1CO0lBQzdFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxhQUF3RSxDQUFBO1FBQ3pGLE1BQU0sYUFBYSxHQUE0QjtZQUM3QyxHQUFHLElBQUk7WUFDUCxPQUFPLEVBQUUsRUFBRTtZQUNYLFVBQVUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVE7U0FDdEMsQ0FBQTtRQUVELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUEsZ0NBQWtCLEVBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUN6RCxLQUFLLEVBQUUsYUFBYTtTQUNyQixDQUFDLENBQUE7UUFFRixHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ1AsT0FBTyxFQUFFLDJCQUEyQjtZQUNwQyxJQUFJLEVBQUUsTUFBTTtTQUNiLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbkIsS0FBSyxFQUFFLHVCQUF1QjtZQUM5QixPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUNoRSxDQUFDLENBQUE7SUFDSixDQUFDO0FBQ0gsQ0FBQyJ9