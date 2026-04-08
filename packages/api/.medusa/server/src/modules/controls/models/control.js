"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controls = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.Controls = utils_1.model.define('control', {
    id: utils_1.model.id({ prefix: 'ctrl' }).primaryKey(),
    scope: utils_1.model.enum(['zone', 'darkstore']),
    scope_id: utils_1.model.text(),
    is_instant_enabled: utils_1.model.boolean().default(true),
    is_slotted_enabled: utils_1.model.boolean().default(true),
    delay_minutes: utils_1.model.number().default(0),
    delay_message: utils_1.model.text().nullable(),
    message_icon: utils_1.model.text().nullable(),
    reason: utils_1.model.json().nullable(),
    is_active: utils_1.model.boolean().default(true),
    created_by: utils_1.model.text().nullable(),
    updated_by: utils_1.model.text().nullable()
});
exports.default = exports.Controls;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL2NvbnRyb2xzL21vZGVscy9jb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVwQyxRQUFBLFFBQVEsR0FBRyxhQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRTtJQUM5QyxFQUFFLEVBQUUsYUFBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRTtJQUM3QyxLQUFLLEVBQUUsYUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN4QyxRQUFRLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUN0QixrQkFBa0IsRUFBRSxhQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztJQUNqRCxrQkFBa0IsRUFBRSxhQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztJQUNqRCxhQUFhLEVBQUUsYUFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDeEMsYUFBYSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDdEMsWUFBWSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDckMsTUFBTSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDL0IsU0FBUyxFQUFFLGFBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQ3hDLFVBQVUsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ25DLFVBQVUsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQ3BDLENBQUMsQ0FBQTtBQUVGLGtCQUFlLGdCQUFRLENBQUEifQ==