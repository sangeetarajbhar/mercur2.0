import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"
import { applyAndAndOrOperators } from "@medusajs/medusa/api/utils/common-validators/common"
import { DocumentMaxFileSize } from "../../../modules/stock-location-extension/types/common";

const FileSchema = z.object({
  file: z.object({
    name: z.string(),
    size: z.number().optional().refine(
      (size) => !size || size <= DocumentMaxFileSize,
      { message: "File size must not exceed 3 MB" }
    ),
    type: z.string().optional(),
  }),
  url: z.string().optional(),
  isThumbnail: z.boolean().optional(),
  base64Content: z.string().optional(), // Add base64 content field for S3 upload
}).or(z.string()); // Allow either file objects or strings for backward compatibility

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
  seller_id: z.string().min(1, "Seller is required"),
  return_location_id: z.string().min(1, "Return Location is required"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  status: z.number().min(1, "Status is required"),
  servisibility_status: z.number().min(1, "Servisibility Status is required"),
  start_time: z.string().min(1, "Start Time is required"),
  end_time: z.string().min(1, "End Time is required"),
  partner_id: z.string().min(1, "Partner is required"),
  location_type: z.number().min(1, "Location Type is required"),
  address_type: z.number().min(1, "Address Type is required"),
  is_delay: z.number().min(1, "Is Delay is required"),
  delay_value: z.string().optional(),
  delay_message: z.string().optional(),

  // Section fields
  partner_wh_code: z.string().optional(),
  lead_time: z.string().optional(),
  managed_by: z.string().optional(),

  // Contact fields
  first_name: z.string().min(1, "First Name is required"),
  last_name: z.string().min(1, "Last Name is required"),
  email: z.string().min(1, "Email is required"),

  // Document fields - CHANGED TO USE FileSchema
  pan_number: z.string().optional(),
  pan_pdf: z.array(FileSchema).optional(),
  gst_number: z.string().optional(),
  gst_pdf: z.array(FileSchema).optional(),
  fssai_number: z.string().optional(),
  fssai_pdf: z.array(FileSchema).optional(),

  stock_location_extension_id: z.string().optional(),
  stock_location_section_id: z.string().optional(),
  stock_location_contact_id: z.string().optional(),
}).optional()

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
  additional_data: AdditionalDataSchema
})


// Common reusable schemas
export const LocationNameSchema = z.object({
  name: z.string().min(1, "Stock Location Name is required"),
});

export const LocationAddressSchema = z.object({
  address: z.object({
    address_1: z.string().min(10, "Address should be at least 10 characters").max(100, "Address should be at most 100 characters"),
    address_2: z.string().optional(),
    country_code: z.string().min(2, "Country is required").max(2),
    city: z.string().min(1, "City is required"),
    postal_code: z.string().min(6, "Postal Code should be at least 6 characters").max(6, "Postal Code should be at least 6 characters"),
    province: z.string().min(1, "State is required"),
    company: z.string().optional(),
    phone: z.string().min(10, "Phone should be at least 10 characters").max(10, "Phone should be at least 10 characters"),
  }),
});




export const CreateLocationSchemaTest = LocationNameSchema.merge(LocationAddressSchema).merge(z.object({
  additional_data: z.record(z.unknown()).optional()
}))

// Define the type from the schema
export type CreateLocationSchemaTypeResponse = z.infer<typeof CreateLocationSchemaTest>;

