import { z } from "zod"

export const AdminGetStockLocationExtensionsParams = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  q: z.string().optional(),
  id: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map((v) => v.trim()).filter(Boolean) : undefined)),
  location_type: z.string().optional(),
})

export type AdminGetStockLocationExtensionsParamsType = z.infer<
  typeof AdminGetStockLocationExtensionsParams
>
