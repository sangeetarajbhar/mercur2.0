import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
} from "@medusajs/medusa/api/utils/validators"

export const AdminGetBrandsParams = createFindParams({
  offset: 0,
  limit: 20,
})
  .merge(
    z.object({
      name: createOperatorMap(z.string()).optional(),
      q: z.string().optional(),
    })
  )
  .transform((data) => {
    if (data.q) {
      const partialFilter = { $ilike: `%${data.q}%` }

      if (!data.name || typeof data.name === "string") {
        data.name = partialFilter
      } else if (typeof data.name === "object" && !Array.isArray(data.name)) {
        data.name = {
          ...data.name,
          ...partialFilter,
        }
      }

      delete (data as Record<string, unknown>).q
    }

    if (typeof data.name === "string") {
      data.name = { $ilike: `%${data.name}%` }
    }

    return data
  })

export type AdminGetBrandsParamsType = z.infer<typeof AdminGetBrandsParams>
