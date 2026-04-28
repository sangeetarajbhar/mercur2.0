import { z } from "zod"

export const AdminUpdateRatingGlobalConfig = z.object({
  enabled: z.boolean(),
})

export const AdminCreateRatingOption = z.object({
  option_text: z.string().min(1),
  sort_order: z.number().int().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const AdminUpdateRatingOption = z.object({
  option_text: z.string().min(1).optional(),
  sort_order: z.number().int().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const AdminGetRatingFeedbackParams = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
  rating: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
  customer_id: z.string().optional(),
  order_id: z.string().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
})

export type AdminGetRatingFeedbackParamsType = z.infer<
  typeof AdminGetRatingFeedbackParams
>

