import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"

export const VendorGetAttributesParams = createFindParams({
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

export const VendorGetAttributeParams = createSelectParams()

export type VendorGetAttributesParamsType = z.infer<typeof VendorGetAttributesParams>
export type VendorGetAttributeParamsType = z.infer<typeof VendorGetAttributeParams>
