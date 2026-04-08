"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendUpdateSlotItemSchema = exports.FrontendModalSlotSchema = exports.FrontendSlotItemSchema = exports.SlotDefinitionWithTimeValidation = exports.BaseSlotDefinitionSchema = exports.TIME_VALIDATION_ERROR_MESSAGE = exports.timeValidationRefinement = exports.validateSlotTimes = void 0;
const zod_1 = require("zod");
const validateSlotTimes = (startTime, endTime, cutOffTime) => {
    try {
        const start = new Date(`2000-01-01T${startTime}:00`);
        const end = new Date(`2000-01-01T${endTime}:00`);
        const cutOff = new Date(`2000-01-01T${cutOffTime}:00`);
        if (end <= start) {
            return {
                isValid: false,
                error: "End time must be after start time",
            };
        }
        if (cutOff >= start) {
            return {
                isValid: false,
                error: "Cut-off time must be before start time",
            };
        }
        return { isValid: true };
    }
    catch {
        return {
            isValid: false,
            error: "Invalid time format",
        };
    }
};
exports.validateSlotTimes = validateSlotTimes;
const timeValidationRefinement = (data) => {
    const startTime = data.start_time;
    const endTime = data.end_time;
    const cutOffTime = data.cut_off_time;
    if (!startTime || !endTime || !cutOffTime) {
        return true;
    }
    const validation = (0, exports.validateSlotTimes)(startTime, endTime, cutOffTime);
    return validation.isValid;
};
exports.timeValidationRefinement = timeValidationRefinement;
exports.TIME_VALIDATION_ERROR_MESSAGE = "End time must be after start time, and cut-off time must be before start time";
exports.BaseSlotDefinitionSchema = zod_1.z.object({
    slot_key: zod_1.z
        .string()
        .min(1, "Slot key is required")
        .regex(/^[A-Za-z0-9:\s-]+$/, "Slot key can only contain letters, numbers, colons, spaces, and hyphens"),
    start_time: zod_1.z.string().min(1, "Start time is required"),
    end_time: zod_1.z.string().min(1, "End time is required"),
    default_capacity: zod_1.z.number().min(1, "Default capacity must be at least 1"),
    is_active: zod_1.z.boolean().default(true),
    cut_off_time: zod_1.z.string().min(1, "Cut-off time is required"),
});
exports.SlotDefinitionWithTimeValidation = exports.BaseSlotDefinitionSchema.refine(exports.timeValidationRefinement, {
    message: exports.TIME_VALIDATION_ERROR_MESSAGE,
    path: ["end_time"],
});
exports.FrontendSlotItemSchema = exports.BaseSlotDefinitionSchema.extend({
    id: zod_1.z.string().optional(),
}).refine(exports.timeValidationRefinement, {
    message: exports.TIME_VALIDATION_ERROR_MESSAGE,
    path: ["end_time"],
});
exports.FrontendModalSlotSchema = exports.BaseSlotDefinitionSchema.extend({
    id: zod_1.z.string().optional(),
    default_capacity: zod_1.z.number().min(1, "Default capacity must be at least 1").max(1000, "Capacity cannot exceed 1000"),
}).refine(exports.timeValidationRefinement, {
    message: exports.TIME_VALIDATION_ERROR_MESSAGE,
    path: ["end_time"],
});
exports.BackendUpdateSlotItemSchema = exports.BaseSlotDefinitionSchema.extend({
    id: zod_1.z.string().min(1, "Slot ID is required"),
}).refine(exports.timeValidationRefinement, {
    message: exports.TIME_VALIDATION_ERROR_MESSAGE,
    path: ["end_time"],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xvdC12YWxpZGF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS9hZG1pbi96b25lcy92YWxpZGF0aW9uL3Nsb3QtdmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBdUI7QUFPaEIsTUFBTSxpQkFBaUIsR0FBRyxDQUMvQixTQUFpQixFQUNqQixPQUFlLEVBQ2YsVUFBa0IsRUFDSSxFQUFFO0lBQ3hCLElBQUksQ0FBQztRQUNILE1BQU0sS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLGNBQWMsU0FBUyxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxjQUFjLE9BQU8sS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsY0FBYyxVQUFVLEtBQUssQ0FBQyxDQUFBO1FBRXRELElBQUksR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ2pCLE9BQU87Z0JBQ0wsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLG1DQUFtQzthQUMzQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3BCLE9BQU87Z0JBQ0wsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLHdDQUF3QzthQUNoRCxDQUFBO1FBQ0gsQ0FBQztRQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNQLE9BQU87WUFDTCxPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRSxxQkFBcUI7U0FDN0IsQ0FBQTtJQUNILENBQUM7QUFDSCxDQUFDLENBQUE7QUEvQlksUUFBQSxpQkFBaUIscUJBK0I3QjtBQUVNLE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxJQUE2QixFQUFFLEVBQUU7SUFDeEUsTUFB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