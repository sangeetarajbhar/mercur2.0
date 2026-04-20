import { z } from "zod"

import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export type AdminGetPriceListRequestsParamsType = z.infer<
  typeof AdminGetPriceListRequestsParams
>
export const AdminGetPriceListRequestsParams = createFindParams({
  offset: 0,
  limit: 50,
}).extend({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
  seller_id: z.string().optional(),
})

export type AdminReviewPriceListRequestType = z.infer<
  typeof AdminReviewPriceListRequest
>
export const AdminReviewPriceListRequest = z.object({
  status: z.enum(["accepted", "rejected"]),
  reviewer_note: z.string(),
})
