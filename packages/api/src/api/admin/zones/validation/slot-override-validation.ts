import { z } from "zod"

const BaseSlotOverrideSchema = z.object({
  slot_date: z.string().min(1, "Slot date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  slot_key: z.string().optional().default(""),
  start_time: z.string().min(1, "Start time is required").regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  end_time: z.string().min(1, "End time is required").regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  cut_off_time: z.string().min(1, "Cut-off time is required").regex(/^\d{2}:\d{2}$/, "Cut-off time must be in HH:MM format"),
  total_capacity: z.number().min(1, "Total capacity must be at least 1"),
  remaining_capacity: z.number().min(0, "Remaining capacity cannot be negative"),
  is_active: z.boolean().default(true),
})

export const CreateSlotOverrideSchema = BaseSlotOverrideSchema.refine((data) => {
  const startTime = new Date(`2000-01-01T${data.start_time}:00`)
  const endTime = new Date(`2000-01-01T${data.end_time}:00`)
  return endTime > startTime
}, {
  message: "End time must be after start time",
  path: ["end_time"],
}).refine((data) => {
  const startTime = new Date(`2000-01-01T${data.start_time}:00`)
  const cutOffTime = new Date(`2000-01-01T${data.cut_off_time}:00`)
  return cutOffTime < startTime
}, {
  message: "Cut-off time must be before start time",
  path: ["cut_off_time"],
}).refine((data) => {
  return data.remaining_capacity <= data.total_capacity
}, {
  message: "Remaining capacity cannot exceed total capacity",
  path: ["remaining_capacity"],
})

export const UpdateSlotOverrideSchema = BaseSlotOverrideSchema.partial().refine((data) => {
  if (data.start_time && data.end_time) {
    const startTime = new Date(`2000-01-01T${data.start_time}:00`)
    const endTime = new Date(`2000-01-01T${data.end_time}:00`)
    return endTime > startTime
  }
  return true
}, {
  message: "End time must be after start time",
  path: ["end_time"],
}).refine((data) => {
  if (data.cut_off_time && data.start_time) {
    const startTime = new Date(`2000-01-01T${data.start_time}:00`)
    const cutOffTime = new Date(`2000-01-01T${data.cut_off_time}:00`)
    return cutOffTime < startTime
  }
  return true
}, {
  message: "Cut-off time must be before start time",
  path: ["cut_off_time"],
}).refine((data) => {
  if (data.remaining_capacity !== undefined && data.total_capacity !== undefined) {
    return data.remaining_capacity <= data.total_capacity
  }
  return true
}, {
  message: "Remaining capacity cannot exceed total capacity",
  path: ["remaining_capacity"],
})

export const QuerySlotOverrideSchema = z.object({
  zone_id: z.string().optional(),
  slot_date: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

export type CreateSlotOverrideInput = z.infer<typeof CreateSlotOverrideSchema>
export type UpdateSlotOverrideInput = z.infer<typeof UpdateSlotOverrideSchema>
export type QuerySlotOverrideInput = z.infer<typeof QuerySlotOverrideSchema>
