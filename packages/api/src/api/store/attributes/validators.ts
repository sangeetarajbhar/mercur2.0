import { z } from "zod"
import { createFindParams, createOperatorMap } from "@medusajs/medusa/api/utils/validators"

export const StoreGetAttributesParams = createFindParams({
  offset: 0,
  limit: 50,
}).merge(
  z.object({
    id: z.union([z.string(), z.array(z.string())]).optional(),
    name: createOperatorMap(z.string()).optional(),
    handle: z.union([z.string(), z.array(z.string())]).optional(),
    q: z.string().optional(),
  })
)

export type StoreGetAttributesParamsType = z.infer<typeof StoreGetAttributesParams>
