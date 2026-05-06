import { z } from 'zod'
import { createSelectParams } from '@medusajs/medusa/api/utils/validators'
import { noNumbers , indianPhoneRegex, noCharacters} from '../../../utils/common-validators/common'

//  Extend the base cart validator to include postal_code for GET requests
export const StoreGetCartsCartV2 = createSelectParams().extend({
  postal_code: z.string(),
  lat:z.string().optional(),
  long:z.string().optional(),
  resolution:z.string().optional(),
})

export const StoreUpdateCartsCartV2 = createSelectParams();

// Cart update body validator with required postal_code
export const StoreUpdateCartV2 = z.object({
  region_id: z.string().optional(),
  email: z.string().email().optional(),
  customer_id: z.string().optional(),
  sales_channel_id: z.string().optional(),
  billing_address: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    country_code: z.string().optional(),
    province: z.string().optional(),
    postal_code: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
  shipping_address: z.object({
    first_name: z.union([
      z.literal(''),
      z.string().refine(
      noNumbers,
      'First name can only contain letters'
    )
    ]).optional(),
  last_name: z.string().optional(),
    phone: z.union([
      z.literal(''),
      z.string().trim().min(10).max(10).refine(
        indianPhoneRegex,
        'Phone number must be 10 digits starting with 6-9'
      )
    ]).optional(),
    company: z.string().optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    country_code: z.string().optional(),
    province: z.string().optional(),
    postal_code: z.string().min(6).max(6).refine(
      noCharacters,
      'Postal code can only contain numbers'
    ).optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
  additional_data: z.object({
    delivery_detail: z.union([
      z.object({
        shipment_type: z.literal('single'),
        delivery_type: z.enum(['standard', 'home_trial'], {
          errorMap: () => ({ message: "delivery_type must be either 'standard' or 'home_trial'" })
        }),
        slot_id: z.string().nullable().optional(),
      }),
      z.object({
        shipment_type: z.literal('multiple'),
        shipments: z.array(
          z.object({
            promise_key: z.union([z.string(), z.number()]),
            delivery_type: z.enum(['standard', 'home_trial'], {
              errorMap: () => ({ message: "delivery_type must be either 'standard' or 'home_trial'" })
            }),
            slot_id: z.string().nullable().optional(),
          })
        ).min(1),
      }),
    ]).optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type StoreUpdateCartV2Type = z.infer<typeof StoreUpdateCartV2>

export type StoreDeleteCartShippingMethodsType = z.infer<
  typeof StoreDeleteCartShippingMethods
>
export const StoreDeleteCartShippingMethods = z.object({
  shipping_method_ids: z.array(z.string())
})

