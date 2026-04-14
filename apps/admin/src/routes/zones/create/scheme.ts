import { z } from "zod"
import { POSTCODE_REGEX, POSTCODE_ERROR_MESSAGE } from "../../../api/admin/zones/validators"

// Zone Details Schema (single step)
export const ZoneDetailsSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  description: z.string().optional(),
  postcodes: z.array(
    z.string().regex(POSTCODE_REGEX, POSTCODE_ERROR_MESSAGE)
  ).min(1, "At least one postcode is required"),
  is_active: z.boolean().default(true),
  location_id: z.string().min(1, "Location is required"),
})

// Extended schema for form with UI-only fields
export const ZoneFormSchema = ZoneDetailsSchema.extend({
  postcodeInput: z.string().optional(), // For the input field only
})

// Instant Promise Schema for form
export const InstantPromiseFormSchema = z.object({
  promise_text: z.string().min(1, "Promise text is required"),
  promise_minutes: z.number().min(1, "Promise minutes must be at least 1").default(30),
  pickup_lead_minutes: z.number().min(0, "Pickup lead minutes must be non-negative").default(0),
  return_lead_minutes: z.number().min(0, "Return lead minutes must be non-negative").default(0),
  is_active: z.boolean().default(true),
})

// Combined schema for the entire form
export const CreateZoneSchema = ZoneDetailsSchema

export type ZoneDetailsSchemaType = z.infer<typeof ZoneDetailsSchema>
export type InstantPromiseFormSchemaType = z.infer<typeof InstantPromiseFormSchema>
export type CreateZoneSchemaType = z.infer<typeof CreateZoneSchema>
