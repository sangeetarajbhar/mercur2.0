import { z } from 'zod'
import { createSelectParams } from '@medusajs/medusa/api/utils/validators'

export const StoreGetDeliveryPromiseParams = createSelectParams().merge(
  z.object({
    pincode: z
      .string()
      .length(6, 'Pincode must be exactly 6 digits')
      .regex(/^\d{6}$/, 'Pincode must contain only numbers'),
    lat: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true
          const num = parseFloat(val)
          return !isNaN(num) && num >= -90 && num <= 90
        },
        { message: 'Latitude must be a valid number between -90 and 90' }
      ),
    long: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true
          const num = parseFloat(val)
          return !isNaN(num) && num >= -180 && num <= 180
        },
        { message: 'Longitude must be a valid number between -180 and 180' }
      ),
  })
)

export type StoreGetDeliveryPromiseParamsType = z.infer<typeof StoreGetDeliveryPromiseParams>

