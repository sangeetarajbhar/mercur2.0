import { z } from "zod"

export const AdminGetControlsParams = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  scope: z.enum(['zone', 'darkstore']).optional(),
  q: z.string().optional(),
})

const ImageMimeType = z.enum(["image/png", "image/jpeg", "image/svg+xml"]) 

const MessageIconFile = z.object({
  base64Content: z.string().min(1, "base64 content is required"),
  file: z.object({
    type: ImageMimeType,
    name: z.string().optional(),
  })
})

export const AdminCreateControl = z.object({
  scope: z.enum(["zone", "darkstore"]),
  scope_id: z.string().min(1, "Scope ID is required"),
  is_active: z.boolean().default(true),
  is_instant_enabled: z.boolean().default(true),
  is_slotted_enabled: z.boolean().default(true),
  delay_minutes: z.number().min(0, "Delay minutes must be non-negative").default(0),
  delay_message: z.string().optional(),
  // either provide a URL/path directly
  message_icon: z.string().url().optional(),
  // or provide an inline file to upload
  message_icon_file: MessageIconFile.optional(),
  reason: z.record(z.unknown()).nullable().default(null),
})

export const AdminUpdateControl = z.object({
  scope: z.enum(["zone", "darkstore"]).optional(),
  scope_id: z.string().min(1, "Scope ID is required").optional(),
  is_active: z.boolean().optional(),
  is_instant_enabled: z.boolean().optional(),
  is_slotted_enabled: z.boolean().optional(),
  delay_minutes: z.number().min(0, "Delay minutes must be non-negative").optional(),
  delay_message: z.string().optional(),
  message_icon: z.string().url().optional(),
  message_icon_file: MessageIconFile.optional(),
  reason: z.record(z.unknown()).nullable().optional(),
})

export type AdminGetControlsParamsType = z.infer<typeof AdminGetControlsParams>
export type AdminCreateControlType = z.infer<typeof AdminCreateControl>
export type AdminUpdateControlType = z.infer<typeof AdminUpdateControl>
