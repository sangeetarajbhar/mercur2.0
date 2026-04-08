"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateZoneTimingStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const zone_1 = require("../../../modules/zone");
const zone_timing_calculator_1 = require("../../../modules/zone/utils/zone-timing-calculator");
exports.updateZoneTimingStep = (0, workflows_sdk_1.createStep)("update-zone-timing", async (input, { container }) => {
    const zoneService = container.resolve(zone_1.ZONE_MODULE);
    const zones = await zoneService.listZones({ location_id: input.location_id });
    if (zones.length === 0) {
        return new workflows_sdk_1.StepResponse({ updated_zones_count: 0 });
    }
    let updatedCount = 0;
    for (const zone of zones) {
        const zoneTiming = await (0, zone_timing_calculator_1.calculateZoneTiming)(container, input.location_id, zone.id);
        const updateData = {
            id: zone.id,
            start_time: zoneTiming.start_time,
            end_time: zoneTiming.effective_end_time,
            updated_by: input.updated_by || null,
        };
        // @ts-expect-error - MedusaService generates this method
        await zoneService.updateZones(updateData);
        updatedCount++;
    }
    return new workflows_sdk_1.StepResponse({ updated_zones_count: updatedCount });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXpvbmUtdGltaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy96b25lL3N0ZXBzL3VwZGF0ZS16b25lLXRpbWluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBNEU7QUFDNUUsZ0RBQW1EO0FBRW5ELCtGQUF3RjtBQUUzRSxRQUFBLG9CQUFvQixHQUFHLElBQUEsMEJBQVUsRUFDNUMsb0JBQW9CLEVBQ3BCLEtBQUssRUFBRSxLQUFnQyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtJQUN4RCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFvQixrQkFBVyxDQUFDLENBQUE7SUFDckUsTUFBTSxLQUFLLEdBQUcsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO0lBRTdFLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixPQUFPLElBQUksNEJBQVksQ0FBQyxFQUFFLG1CQUFtQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQTtJQUVwQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBQSw0Q0FBbUIsRUFBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFbkYsTUFBTSxVQUFVLEdBQWtCO1lBQ2hDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNYLFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVTtZQUNqQyxRQUFRLEVBQUUsVUFBVSxDQUFDLGtCQUFrQjtZQUN2QyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxJQUFJO1NBQ3JDLENBQUE7UUFFRCx5REFBeUQ7UUFDekQsTUFBTSxXQUFXLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3pDLFlBQVksRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxPQUFPLElBQUksNEJBQVksQ0FBQyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxDQUFDLENBQUE7QUFDaEUsQ0FBQyxDQUNGLENBQUEifQ==