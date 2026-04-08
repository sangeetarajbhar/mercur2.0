"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotOverrides = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.SlotOverrides = utils_1.model
    .define("slot_override", {
    id: utils_1.model.id({ prefix: "so" }).primaryKey(),
    zone_id: utils_1.model.text(),
    slot_date: utils_1.model.text(),
    slot_key: utils_1.model.text().nullable(),
    start_time: utils_1.model.text(),
    end_time: utils_1.model.text(),
    cut_off_time: utils_1.model.text().nullable(),
    total_capacity: utils_1.model.number(),
    remaining_capacity: utils_1.model.number(),
    is_active: utils_1.model.boolean().default(true),
    created_by: utils_1.model.text().nullable(),
    updated_by: utils_1.model.text().nullable(),
})
    .indexes([
    {
        name: "UQ_slot_override_zone_date_time",
        on: ["zone_id", "slot_date", "start_time", "end_time"],
        where: "deleted_at IS NULL",
        unique: true,
    },
]);
exports.default = exports.SlotOverrides;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xvdF9vdmVycmlkZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3Nsb3Qtb3ZlcnJpZGVzL21vZGVscy9zbG90X292ZXJyaWRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVwQyxRQUFBLGFBQWEsR0FBRyxhQUFLO0tBQy9CLE1BQU0sQ0FBQyxlQUFlLEVBQUU7SUFDdkIsRUFBRSxFQUFFLGFBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUU7SUFDM0MsT0FBTyxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDckIsU0FBUyxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDdkIsUUFBUSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDakMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDeEIsUUFBUSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDdEIsWUFBWSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDckMsY0FBYyxFQUFFLGFBQUssQ0FBQyxNQUFNLEVBQUU7SUFDOUIsa0JBQWtCLEVBQUUsYUFBSyxDQUFDLE1BQU0sRUFBRTtJQUNsQyxTQUFTLEVBQUUsYUFBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDeEMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDcEMsQ0FBQztLQUNELE9BQU8sQ0FBQztJQUNQO1FBQ0UsSUFBSSxFQUFFLGlDQUFpQztRQUN2QyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUM7UUFDdEQsS0FBSyxFQUFFLG9CQUFvQjtRQUMzQixNQUFNLEVBQUUsSUFBSTtLQUNiO0NBQ0YsQ0FBQyxDQUFBO0FBRUosa0JBQWUscUJBQWEsQ0FBQSJ9