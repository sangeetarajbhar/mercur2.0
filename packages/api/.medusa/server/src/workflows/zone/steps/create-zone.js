"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createZoneStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const zone_1 = require("../../../modules/zone");
const zone_timing_calculator_1 = require("../../../modules/zone/utils/zone-timing-calculator");
exports.createZoneStep = (0, workflows_sdk_1.createStep)("create-zone", async (input, { container }) => {
    const zoneService = container.resolve(zone_1.ZONE_MODULE);
    const zoneData = {
        location_id: input.location_id,
        name: input.name,
        description: input.description || null,
        postcodes: input.postcodes,
        is_active: input.is_active,
        created_by: input.created_by || null,
        updated_by: input.updated_by || null,
    };
    // @ts-expect-error - MedusaService generates this method
    const zone = await zoneService.createZones(zoneData);
    const zoneTiming = await (0, zone_timing_calculator_1.calculateZoneTiming)(container, input.location_id, zone.id);
    const updatedZone = await zoneService.updateZones({
        id: zone.id,
        start_time: zoneTiming.start_time,
        end_time: zoneTiming.effective_end_time,
    });
    return new workflows_sdk_1.StepResponse(updatedZone);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXpvbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3pvbmUvc3RlcHMvY3JlYXRlLXpvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBQTRFO0FBQzVFLGdEQUFtRDtBQUVuRCwrRkFBd0Y7QUFFM0UsUUFBQSxjQUFjLEdBQUcsSUFBQSwwQkFBVSxFQUN0QyxhQUFhLEVBQ2IsS0FBSyxFQUFFLEtBQTBCLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBK0IsRUFBRTtJQUMvRSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFvQixrQkFBVyxDQUFDLENBQUE7SUFFckUsTUFBTSxRQUFRLEdBQWtCO1FBQzlCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztRQUM5QixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7UUFDaEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLElBQUksSUFBSTtRQUN0QyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7UUFDMUIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1FBQzFCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUk7UUFDcEMsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLElBQUksSUFBSTtLQUNyQyxDQUFBO0lBRUQseURBQXlEO0lBQ3pELE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNwRCxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUEsNENBQW1CLEVBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBRW5GLE1BQU0sV0FBVyxHQUFHLE1BQU0sV0FBVyxDQUFDLFdBQVcsQ0FBQztRQUNoRCxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDWCxVQUFVLEVBQUUsVUFBVSxDQUFDLFVBQVU7UUFDakMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxrQkFBa0I7S0FDeEMsQ0FBQyxDQUFBO0lBRUYsT0FBTyxJQUFJLDRCQUFZLENBQUMsV0FBOEIsQ0FBQyxDQUFBO0FBQ3pELENBQUMsQ0FDRixDQUFBIn0=