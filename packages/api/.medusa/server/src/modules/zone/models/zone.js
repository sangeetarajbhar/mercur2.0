"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zones = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.Zones = utils_1.model.define("zone", {
    id: utils_1.model.id({ prefix: "zone" }).primaryKey(),
    location_id: utils_1.model.text(),
    name: utils_1.model.text(),
    description: utils_1.model.text().nullable(),
    postcodes: utils_1.model.json(),
    is_active: utils_1.model.boolean().default(true),
    start_time: utils_1.model.text().nullable(),
    end_time: utils_1.model.text().nullable(),
    metadata: utils_1.model.json().default({}),
    created_by: utils_1.model.text().nullable(),
    updated_by: utils_1.model.text().nullable(),
});
exports.default = exports.Zones;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiem9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3pvbmUvbW9kZWxzL3pvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQWlEO0FBRXBDLFFBQUEsS0FBSyxHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO0lBQ3hDLEVBQUUsRUFBRSxhQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFO0lBQzdDLFdBQVcsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ3pCLElBQUksRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2xCLFdBQVcsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3BDLFNBQVMsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ3ZCLFNBQVMsRUFBRSxhQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztJQUN4QyxVQUFVLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNuQyxRQUFRLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNqQyxRQUFRLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7SUFDbEMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDcEMsQ0FBQyxDQUFBO0FBRUYsa0JBQWUsYUFBSyxDQUFBIn0=