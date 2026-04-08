import { z } from "zod"
import { BaseSlotDefinitionSchema, FrontendSlotItemSchema, BackendUpdateSlotItemSchema } from "./validation/slot-validation"

export const POSTCODE_REGEX = /^\d{6}$/
export const POSTCODE_ERROR_MESSAGE = "Postcode must be exactly 6 digits"

export const AdminGetZonesParams = z.object({
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  offset: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  q: z.string().optional(),
})

export const AdminCreateZone = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  postcodes: z.array(z.string().regex(POSTCODE_REGEX, POSTCODE_ERROR_MESSAGE)).min(1, "At least one postcode is required").default([]),
  is_active: z.boolean().default(true),
  location_id: z.string().min(1, "Location ID is required"),
})

export const AdminUpdateZone = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  postcodes: z.array(z.string().regex(POSTCODE_REGEX, POSTCODE_ERROR_MESSAGE)).min(1, "At least one postcode is required").optional(),
  is_active: z.boolean().optional(),
  location_id: z.string().min(1, "Location ID is required").optional(),
})

const SlotItemSchema = FrontendSlotItemSchema

export const CreateBulkSlotDefinitionSchema = z.object({
  slots: z.array(SlotItemSchema).min(1, "At least one slot definition is required"),
})

export const UpdateSlotDefinitionSchema = BaseSlotDefinitionSchema.partial()

const UpdateSlotItemSchema = BackendUpdateSlotItemSchema

export const BulkUpdateSlotDefinitionSchema = z.object({
  slots: z.array(UpdateSlotItemSchema).min(1, "At least one slot is required"),
})

export const QuerySlotDefinitionSchema = z.object({
  zone_id: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

const BaseInstantPromiseSchema = z.object({
  promise_text: z.string().min(1, "Promise text is required"),
  promise_minutes: z.number().min(1, "Promise minutes must be at least 1").default(30),
  pickup_lead_minutes: z.number().min(0, "Pickup lead minutes must be non-negative").default(0),
  return_lead_minutes: z.number().min(0, "Return lead minutes must be non-negative").default(0),
  is_active: z.boolean().default(true),
})

export const CreateInstantPromiseSchema = BaseInstantPromiseSchema.extend({
  zone_id: z.string().min(1, "Zone ID is required"),
})

export const UpdateInstantPromiseSchema = BaseInstantPromiseSchema.partial()

export const QueryInstantPromiseSchema = z.object({
  zone_id: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

export type AdminGetZonesParamsType = z.infer<typeof AdminGetZonesParams>
export type AdminCreateZoneType = z.infer<typeof AdminCreateZone>
export type AdminUpdateZoneType = z.infer<typeof AdminUpdateZone>
export type UpdateSlotDefinitionInput = z.infer<typeof UpdateSlotDefinitionSchema>
export type QuerySlotDefinitionInput = z.infer<typeof QuerySlotDefinitionSchema>
export type CreateBulkSlotDefinitionInput = z.infer<typeof CreateBulkSlotDefinitionSchema>
export type BulkUpdateSlotDefinitionInput = z.infer<typeof BulkUpdateSlotDefinitionSchema>
export type CreateInstantPromiseInput = z.infer<typeof CreateInstantPromiseSchema>
export type UpdateInstantPromiseInput = z.infer<typeof UpdateInstantPromiseSchema>
export type QueryInstantPromiseInput = z.infer<typeof QueryInstantPromiseSchema>
