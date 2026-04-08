"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateZoneStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const zone_1 = require("../../../modules/zone");
const zone_timing_calculator_1 = require("../../../modules/zone/utils/zone-timing-calculator");
exports.updateZoneStep = (0, workflows_sdk_1.createStep)("update-zone", async (input, { container }) => {
    const zoneService = container.resolve(zone_1.ZONE_MODULE);
    const oldZone = await zoneService.retrieveZones(input.zone_id);
    const targetLocationId = input.location_id || oldZone.location_id;
    const zoneTiming = await (0, zone_timing_calculator_1.calculateZoneTiming)(container, targetLocationId, input.zone_id);
    const updateData = {
        id: input.zone_id,
        name: input.name,
        description: input.description || null,
        postcodes: input.postcodes,
        is_active: input.is_active,
        updated_by: input.updated_by || null,
        start_time: zoneTiming.start_time,
        end_time: zoneTiming.effective_end_time,
    };
    if (input.location_id) {
        updateData.location_id = input.location_id;
    }
    // @ts-expect-error - MedusaService generates this method
    const updatedZone = await zoneService.updateZones(updateData);
    return new workflows_sdk_1.StepResponse({
        oldZone: oldZone,
        updatedZone,
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXpvbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3pvbmUvc3RlcHMvdXBkYXRlLXpvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBQTRFO0FBQzVFLGdEQUFtRDtBQUVuRCwrRkFBd0Y7QUFFM0UsUUFBQSxjQUFjLEdBQUcsSUFBQSwwQkFBVSxFQUN0QyxhQUFhLEVBQ2IsS0FBSyxFQUFFLEtBQTBCLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFO0lBQ2xELE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQW9CLGtCQUFXLENBQUMsQ0FBQTtJQUNyRSxNQUFNLE9BQU8sR0FBRyxNQUFNLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBRTlELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFBO0lBQ2pFLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBQSw0Q0FBbUIsRUFBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBRXhGLE1BQU0sVUFBVSxHQUFrQjtRQUNoQyxFQUFFLEVBQUUsS0FBSyxDQUFDLE9BQU87UUFDakIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1FBQ2hCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUk7UUFDdEMsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1FBQzFCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztRQUMxQixVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxJQUFJO1FBQ3BDLFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVTtRQUNqQyxRQUFRLEVBQUUsVUFBVSxDQUFDLGtCQUFrQjtLQUN4QyxDQUFBO0lBRUQsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdEIsVUFBVSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFBO0lBQzVDLENBQUM7SUFFRCx5REFBeUQ7SUFDekQsTUFBTSxXQUFXLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBRTdELE9BQU8sSUFBSSw0QkFBWSxDQUFDO1FBQ3RCLE9BQU8sRUFBRSxPQUEwQjtRQUNuQyxXQUFXO0tBQ1osQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUNGLENBQUEifQ==