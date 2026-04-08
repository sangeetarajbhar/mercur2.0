"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuerySlotOverrideSchema = exports.UpdateSlotOverrideSchema = exports.CreateSlotOverrideSchema = void 0;
const zod_1 = require("zod");
const BaseSlotOverrideSchema = zod_1.z.object({
    slot_date: zod_1.z.string().min(1, "Slot date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    slot_key: zod_1.z.string().optional().default(""),
    start_time: zod_1.z.string().min(1, "Start time is required").regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    end_time: zod_1.z.string().min(1, "End time is required").regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    cut_off_time: zod_1.z.string().min(1, "Cut-off time is required").regex(/^\d{2}:\d{2}$/, "Cut-off time must be in HH:MM format"),
    total_capacity: zod_1.z.number().min(1, "Total capacity must be at least 1"),
    remaining_capacity: zod_1.z.number().min(0, "Remaining capacity cannot be negative"),
    is_active: zod_1.z.boolean().default(true),
});
exports.CreateSlotOverrideSchema = BaseSlotOverrideSchema.refine((data) => {
    const startTime = new Date(`2000-01-01T${data.start_time}:00`);
    const endTime = new Date(`2000-01-01T${data.end_time}:00`);
    return endTime > startTime;
}, {
    message: "End time must be after start time",
    path: ["end_time"],
}).refine((data) => {
    const startTime = new Date(`2000-01-01T${data.start_time}:00`);
    const cutOffTime = new Date(`2000-01-01T${data.cut_off_time}:00`);
    return cutOffTime < startTime;
}, {
    message: "Cut-off time must be before start time",
    path: ["cut_off_time"],
}).refine((data) => {
    return data.remaining_capacity <= data.total_capacity;
}, {
    message: "Remaining capacity cannot exceed total capacity",
    path: ["remaining_capacity"],
});
exports.UpdateSlotOverrideSchema = BaseSlotOverrideSchema.partial().refine((data) => {
    if (data.start_time && data.end_time) {
        const startTime = new Date(`2000-01-01T${data.start_time}:00`);
        const endTime = new Date(`2000-01-01T${data.end_time}:00`);
        return endTime > startTime;
    }
    return true;
}, {
    message: "End time must be after start time",
    path: ["end_time"],
}).refine((data) => {
    if (data.cut_off_time && data.start_time) {
        const startTime = new Date(`2000-01-01T${data.start_time}:00`);
        const cutOffTime = new Date(`2000-01-01T${data.cut_off_time}:00`);
        return cutOffTime < startTime;
    }
    return true;
}, {
    message: "Cut-off time must be before start time",
    path: ["cut_off_time"],
}).refine((data) => {
    if (data.remaining_capacity !== undefined && data.total_capacity !== undefined) {
        return data.remaining_capacity <= data.total_capacity;
    }
    return true;
}, {
    message: "Remaining capacity cannot exceed total capacity",
    path: ["remaining_capacity"],
});
exports.QuerySlotOverrideSchema = zod_1.z.object({
    zone_id: zod_1.z.string().optional(),
    slot_date: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xvdC1vdmVycmlkZS12YWxpZGF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS9hZG1pbi96b25lcy92YWxpZGF0aW9uL3Nsb3Qtb3ZlcnJpZGUtdmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBdUI7QUFFdkIsTUFBTSxzQkFBc0IsR0FBRyxPQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3RDLFNBQVMsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxtQ0FBbUMsQ0FBQztJQUN2SCxRQUFRLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7SUFDM0MsVUFBVSxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSw4QkFBOEIsQ0FBQztJQUM5RyxRQUFRLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLDhCQUE4QixDQUFDO0lBQzFHLFlBQVksRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsc0NBQXNDLENBQUM7SUFDMUgsY0FBYyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLG1DQUFtQyxDQUFDO0lBQ3RFLGtCQUFrQixFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLHVDQUF1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