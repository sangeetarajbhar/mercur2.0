"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const slot_overrides_1 = require("../../../../../modules/slot-overrides");
const utils_1 = require("@medusajs/framework/utils");
async function GET(req, res) {
    try {
        const { id: zoneId } = req.params;
        const query = req.query;
        const slotOverrideService = req.scope.resolve(slot_overrides_1.SLOT_OVERRIDES_MODULE);
        const filters = { zone_id: zoneId };
        if (query.slot_date) {
            if (typeof query.slot_date === "string" && query.slot_date.includes(",")) {
                filters.slot_date = query.slot_date.split(",").map((d) => d.trim());
            }
            else {
                filters.slot_date = query.slot_date;
            }
        }
        if (query.is_active !== undefined)
            filters.is_active = query.is_active;
        const slotOverrides = await slotOverrideService.listSlotOverrides(filters, {
            skip: query.offset || 0,
            take: query.limit || 100,
        });
        res.json({
            slot_overrides: slotOverrides,
            count: slotOverrides.length,
        });
    }
    catch (err) {
        res.status(500).json({
            error: "Failed to fetch slot overrides",
            details: err instanceof Error ? err.message : String(err),
        });
    }
}
async function POST(req, res) {
    try {
        const { id: zoneId } = req.params;
        const validatedData = (req.validatedBody || req.body);
        const slotOverrideService = req.scope.resolve(slot_overrides_1.SLOT_OVERRIDES_MODULE);
        const eventBus = req.scope.resolve(utils_1.Modules.EVENT_BUS);
        const slotOverridePayload = {
            ...validatedData,
            zone_id: zoneId,
            created_by: req.auth_context.actor_id,
            updated_by: req.auth_context.actor_id,
        };
        const slotOverride = await slotOverrideService.createSlotOverrides(slotOverridePayload);
        await eventBus.emit({
            name: "audit.log",
            data: {
                entity_type: "slot_override",
                entity_id: slotOverride.id,
                operation: "CREATE",
                new_entity: slotOverride,
                changed_by: req.auth_context.actor_id,
                metadata: { zone_id: zoneId },
            },
        });
        res.status(201).json({
            message: "Slot override created successfully",
            slot_override: slotOverride,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to create slot override",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL1tpZF0vc2xvdC1vdmVycmlkZXMvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFNQSxrQkFrQ0M7QUFFRCxvQkFzQ0M7QUE5RUQsMEVBQTZFO0FBRTdFLHFEQUFtRDtBQUU1QyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQStCLEVBQUUsR0FBbUI7SUFDNUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUEwQyxDQUFBO1FBRTVELE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQTRCLHNDQUFxQixDQUFDLENBQUE7UUFFL0YsTUFBTSxPQUFPLEdBQXdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFBO1FBRXhELElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLElBQUksT0FBTyxLQUFLLENBQUMsU0FBUyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN6RSxPQUFPLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDckUsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLE9BQU8sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQTtZQUNyQyxDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQUUsT0FBTyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFBO1FBRXRFLE1BQU0sYUFBYSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFO1lBQ3pFLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUM7WUFDdkIsSUFBSSxFQUFFLEtBQUssQ0FBQyxLQUFLLElBQUksR0FBRztTQUN6QixDQUFDLENBQUE7UUFFRixHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ1AsY0FBYyxFQUFFLGFBQWE7WUFDN0IsS0FBSyxFQUFFLGFBQWEsQ0FBQyxNQUFNO1NBQzVCLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbkIsS0FBSyxFQUFFLGdDQUFnQztZQUN2QyxPQUFPLEVBQUUsR0FBRyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztTQUMxRCxDQUFDLENBQUE7SUFDSixDQUFDO0FBQ0gsQ0FBQztBQUVNLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBK0IsRUFBRSxHQUFtQjtJQUM3RSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7UUFDakMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQTRCLENBQUE7UUFFaEYsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBNEIsc0NBQXFCLENBQUMsQ0FBQTtRQUMvRixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFckQsTUFBTSxtQkFBbUIsR0FBRztZQUMxQixHQUFHLGFBQWE7WUFDaEIsT0FBTyxFQUFFLE1BQU07WUFDZixVQUFVLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRO1lBQ3JDLFVBQVUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVE7U0FDdEMsQ0FBQTtRQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUV2RixNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDbEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsSUFBSSxFQUFFO2dCQUNKLFdBQVcsRUFBRSxlQUFlO2dCQUM1QixTQUFTLEVBQUUsWUFBWSxDQUFDLEVBQUU7Z0JBQzFCLFNBQVMsRUFBRSxRQUFRO2dCQUNuQixVQUFVLEVBQUUsWUFBWTtnQkFDeEIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUTtnQkFDckMsUUFBUSxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTthQUM5QjtTQUNGLENBQUMsQ0FBQTtRQUVGLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ25CLE9BQU8sRUFBRSxvQ0FBb0M7WUFDN0MsYUFBYSxFQUFFLFlBQVk7U0FDNUIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuQixLQUFLLEVBQUUsZ0NBQWdDO1lBQ3ZDLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQ2hFLENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDIn0=