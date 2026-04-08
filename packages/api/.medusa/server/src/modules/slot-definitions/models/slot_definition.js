"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotDefinitions = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.SlotDefinitions = utils_1.model
    .define("slot_definition", {
    id: utils_1.model.id({ prefix: "slot" }).primaryKey(),
    zone_id: utils_1.model.text(),
    slot_key: utils_1.model.text(),
    start_time: utils_1.model.text(),
    end_time: utils_1.model.text(),
    default_capacity: utils_1.model.number(),
    is_active: utils_1.model.boolean().default(true),
    cut_off_time: utils_1.model.text(),
    metadata: utils_1.model.json().default({}),
    created_by: utils_1.model.text().nullable(),
    updated_by: utils_1.model.text().nullable(),
})
    .indexes([
    {
        name: "UQ_slot_definition_zone_time",
        on: ["zone_id", "start_time", "end_time"],
        where: "deleted_at IS NULL",
        unique: true,
    },
]);
exports.default = exports.SlotDefinitions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xvdF9kZWZpbml0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvc2xvdC1kZWZpbml0aW9ucy9tb2RlbHMvc2xvdF9kZWZpbml0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVwQyxRQUFBLGVBQWUsR0FBRyxhQUFLO0tBQ2pDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRTtJQUN6QixFQUFFLEVBQUUsYUFBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRTtJQUM3QyxPQUFPLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUNyQixRQUFRLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUN0QixVQUFVLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUN4QixRQUFRLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUN0QixnQkFBZ0IsRUFBRSxhQUFLLENBQUMsTUFBTSxFQUFFO0lBQ2hDLFNBQVMsRUFBRSxhQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztJQUN4QyxZQUFZLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUMxQixRQUFRLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7SUFDbEMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDcEMsQ0FBQztLQUNELE9BQU8sQ0FBQztJQUNQO1FBQ0UsSUFBSSxFQUFFLDhCQUE4QjtRQUNwQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQztRQUN6QyxLQUFLLEVBQUUsb0JBQW9CO1FBQzNCLE1BQU0sRUFBRSxJQUFJO0tBQ2I7Q0FDRixDQUFDLENBQUE7QUFFSixrQkFBZSx1QkFBZSxDQUFBIn0=