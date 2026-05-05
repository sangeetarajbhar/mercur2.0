import { z } from "zod"
import { createFindParams } from "../../../../api/utils/validators"

export type StoreGetPaymentProvidersParamsType = z.infer<
  typeof StoreGetPaymentProvidersParams
>
export const StoreGetPaymentProvidersParams = createFindParams({
  limit: 20,
  offset: 0,
}).merge(
  z.object({
    region_id: z.string().optional(),
  })
)