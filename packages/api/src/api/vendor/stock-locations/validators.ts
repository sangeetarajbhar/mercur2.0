import { z } from 'zod'

import { applyAndAndOrOperators } from '@medusajs/medusa/api/utils/common-validators/common'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

// Additional data schema for comprehensive updates
const AdditionalDataSchema = z.object({
  // Extension fields
  return_location_id: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  status: z.number().optional(),
  servisibility_status: z.number().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  partner_id: z.string().optional(),
  location_type: z.number().optional(),
  address_type: z.number().optional(),

  // Section fields
  partner_wh_code: z.string().optional(),
  lead_time: z.string().optional(),
  managed_by: z.string().optional(),

  // Contact fields
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),

  // Document fields
  pan_number: z.string().optional(),
  pan_pdf: z.array(z.any()).optional(),
  gst_number: z.string().optional(),
  gst_pdf: z.array(z.any()).optional(),
  fssai_number: z.string().optional(),
  fssai_pdf: z.array(z.any()).optional(),

  stock_location_extension_id: z.string().optional(),
  stock_location_section_id: z.string().optional(),
  stock_location_contact_id: z.string().optional(),
}).optional()

export type VendorGetStockLocationParamsType = z.infer<
  typeof VendorGetStockLocationParams
>

export const VendorGetStockLocationsParamsDirectFields = z.object({
  stock_location_id: z.union([z.string(), z.array(z.string())]).optional()
})

export const VendorGetStockLocationParams = createFindParams({
  limit: 20,
  offset: 0
})
  .merge(VendorGetStockLocationsParamsDirectFields)
  .merge(applyAndAndOrOperators(VendorGetStockLocationsParamsDirectFields))

/**
 * @schema UpsertStockLocationAddress
 * type: object
 * required:
 *   - address_1
 *   - country_code
 * properties:
 *   address_1:
 *     type: string
 *     description: Address line 1
 *   address_2:
 *     type: string
 *     nullable: true
 *     description: Address line 2
 *   company:
 *     type: string
 *     nullable: true
 *     description: Company name
 *   city:
 *     type: string
 *     nullable: true
 *     description: City
 *   country_code:
 *     type: string
 *     description: Country code
 *   phone:
 *     type: string
 *     nullable: true
 *     description: Phone number
 *   postal_code:
 *     type: string
 *     nullable: true
 *     description: Postal code
 *   province:
 *     type: string
 *     nullable: true
 *     description: Province
 */
export const UpsertStockLocationAddress = z.object({
  address_1: z.string(),
  address_2: z.string().nullish(),
  company: z.string().nullish(),
  city: z.string().nullish(),
  country_code: z.string(),
  phone: z.string().nullish(),
  postal_code: z.string().nullish(),
  province: z.string().nullish()
})

export type UpsertStockLocationAddressType = z.infer<
  typeof UpsertStockLocationAddress
>

export type VendorCreateStockLocationType = z.infer<
  typeof VendorCreateStockLocation
>
/**
 * @schema VendorCreateStockLocation
 * type: object
 * required:
 *   - name
 * properties:
 *   name:
 *     type: string
 *     description: Name of the stock location
 *   address:
 *     $ref: "#/components/schemas/UpsertStockLocationAddress"
 *   address_id:
 *     type: string
 *     nullable: true
 *     description: ID of an existing address to use
 *   metadata:
 *     type: object
 *     nullable: true
 *     description: Additional metadata
 */
export const VendorCreateStockLocation = z.object({
  name: z.preprocess((val: string) => val?.trim(), z.string()),
  address: UpsertStockLocationAddress.optional(),
  address_id: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
  additional_data: AdditionalDataSchema,
})

export type VendorUpdateStockLocationType = z.infer<
  typeof VendorUpdateStockLocation
>
/**
 * @schema VendorUpdateStockLocation
 * type: object
 * properties:
 *   name:
 *     type: string
 *     description: Name of the stock location
 *   address:
 *     $ref: "#/components/schemas/UpsertStockLocationAddress"
 *   address_id:
 *     type: string
 *     nullable: true
 *     description: ID of an existing address to use
 *   metadata:
 *     type: object
 *     nullable: true
 *     description: Additional metadata
 *   additional_data:
 *     type: object
 *     nullable: true
 *     description: Additional data for extensions, sections, documents, and contacts
 */
export const VendorUpdateStockLocation = z.object({
  name: z
    .preprocess((val: string) => val.trim(), z.string().optional())
    .optional(),
  address: UpsertStockLocationAddress.optional(),
  address_id: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
  additional_data: AdditionalDataSchema
})

export type VendorCreateStockLocationFulfillmentSetType = z.infer<
  typeof VendorCreateStockLocationFulfillmentSet
>
/**
 * @schema VendorCreateStockLocationFulfillmentSet
 * type: object
 * required:
 *   - name
 *   - type
 * properties:
 *   name:
 *     type: string
 *     description: Name of the fulfillment set
 *   type:
 *     type: string
 *     description: Type of the fulfillment set
 */
export const VendorCreateStockLocationFulfillmentSet = z
  .object({
    name: z.string(),
    type: z.string()
  })
  .strict()
