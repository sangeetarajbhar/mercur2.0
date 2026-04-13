import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"
import { applyAndAndOrOperators } from "@medusajs/medusa/api/utils/common-validators/common"

export type AdminGetStockLocationParamsType = z.infer<
  typeof AdminGetStockLocationParams
>
export const AdminGetStockLocationParams = createSelectParams()

export const AdminGetStockLocationsParamsDirectFields = z.object({
  q: z.string().optional(),
  id: z.union([z.string(), z.array(z.string())]).optional(),
  name: z.union([z.string(), z.array(z.string())]).optional(),
  address_id: z.union([z.string(), z.array(z.string())]).optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
  deleted_at: createOperatorMap().optional(),
})

export type AdminGetStockLocationsParamsType = z.infer<
  typeof AdminGetStockLocationsParams
>
export const AdminGetStockLocationsParams = createFindParams({
  limit: 20,
  offset: 0,
})
  .merge(AdminGetStockLocationsParamsDirectFields)
  .merge(applyAndAndOrOperators(AdminGetStockLocationsParamsDirectFields))
  .merge(
    z.object({
      sales_channel_id: z.union([z.string(), z.array(z.string())]).optional(),
    })
  )

export type AdminUpsertStockLocationAddressType = z.infer<
  typeof AdminUpsertStockLocationAddress
>
export const AdminUpsertStockLocationAddress = z.object({
  address_1: z.string(),
  address_2: z.string().nullish(),
  company: z.string().nullish(),
  city: z.string().nullish(),
  country_code: z.string(),
  phone: z.string().nullish(),
  postal_code: z.string().nullish(),
  province: z.string().nullish(),
})

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

export type AdminCreateStockLocationType = z.infer<
  typeof AdminCreateStockLocation
>
export const AdminCreateStockLocation = z.object({
  name: z.preprocess((val: any) => val.trim(), z.string()),
  address: AdminUpsertStockLocationAddress.optional(),
  address_id: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
  // additional_data: AdditionalDataSchema,
})

export type AdminUpdateStockLocationType = z.infer<
  typeof AdminUpdateStockLocation
>
export const AdminUpdateStockLocation = z.object({
  name: z
    .preprocess((val: any) => val.trim(), z.string().optional())
    .optional(),
  address: AdminUpsertStockLocationAddress.optional(),
  address_id: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
})
