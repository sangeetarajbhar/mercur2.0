import { z } from "zod";

export interface TimeValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateSlotTimes = (
  startTime: string,
  endTime: string,
  cutOffTime: string
): TimeValidationResult => {
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
  } catch {
    return {
      isValid: false,
      error: "Invalid time format",
    };
  }
};

export const timeValidationRefinement = (data: Record<string, unknown>) => {
  const startTime = data.start_time as string;
  const endTime = data.end_time as string;
  const cutOffTime = data.cut_off_time as string;

  if (!startTime || !endTime || !cutOffTime) {
    return true;
  }

  const validation = validateSlotTimes(startTime, endTime, cutOffTime);
  return validation.isValid;
};

export const TIME_VALIDATION_ERROR_MESSAGE =
  "End time must be after start time, and cut-off time must be before start time";

export const BaseSlotDefinitionSchema = z.object({
  slot_key: z
    .string()
    .min(1, "Slot key is required")
    .regex(
      /^[A-Za-z0-9:\s-]+$/,
      "Slot key can only contain letters, numbers, colons, spaces, and hyphens"
    ),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  default_capacity: z.number().min(1, "Default capacity must be at least 1"),
  is_active: z.boolean().default(true),
  cut_off_time: z.string().min(1, "Cut-off time is required"),
});

export const SlotDefinitionWithTimeValidation = BaseSlotDefinitionSchema.refine(
  timeValidationRefinement,
  {
    message: TIME_VALIDATION_ERROR_MESSAGE,
    path: ["end_time"],
  }
);

export const FrontendSlotItemSchema = BaseSlotDefinitionSchema.extend({
  id: z.string().optional(),
}).refine(timeValidationRefinement, {
  message: TIME_VALIDATION_ERROR_MESSAGE,
  path: ["end_time"],
});

export const FrontendModalSlotSchema = BaseSlotDefinitionSchema.extend({
  id: z.string().optional(),
  default_capacity: z
    .number()
    .min(1, "Default capacity must be at least 1")
    .max(1000, "Capacity cannot exceed 1000"),
}).refine(timeValidationRefinement, {
  message: TIME_VALIDATION_ERROR_MESSAGE,
  path: ["end_time"],
});

export const BackendUpdateSlotItemSchema = BaseSlotDefinitionSchema.extend({
  id: z.string().min(1, "Slot ID is required"),
}).refine(timeValidationRefinement, {
  message: TIME_VALIDATION_ERROR_MESSAGE,
  path: ["end_time"],
});
