import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
} from "@medusajs/medusa/api/utils/validators"

const parseCommaSeparated = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }

  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export const StoreGetBrandsParams = createFindParams({
  offset: 0,
  limit: 50,
})
  .merge(
    z.object({
      id: createOperatorMap(z.string(), parseCommaSeparated).optional(),
      name: createOperatorMap(z.string()).optional(),
      q: z.string().optional(),
    })
  )
  .transform((data) => {
    if (typeof data.name === "string") {
      data.name = { $ilike: `%${data.name}%` }
    }

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

    return data
  })

export type StoreGetBrandsParamsType = z.infer<typeof StoreGetBrandsParams>
