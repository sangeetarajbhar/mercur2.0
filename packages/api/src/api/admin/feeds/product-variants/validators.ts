import { z } from "zod"

export const AdminGetProductVariantFeedParams = z.object({
  /**
   * Optional number of pagination loops to run (pages to fetch).
   */
  loop: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const num = Number(val)
        return Number.isNaN(num) ? undefined : num
      }
      return val
    }, z.number().int().positive().max(10_000).optional()),
  /**
   * Optional page size per loop; keep it modest to reduce payload.
   */
  page_size: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const num = Number(val)
        return Number.isNaN(num) ? undefined : num
      }
      return val
    }, z.number().int().positive().max(500).optional()),
})

export type AdminGetProductVariantFeedParamsType = z.infer<
  typeof AdminGetProductVariantFeedParams
>


