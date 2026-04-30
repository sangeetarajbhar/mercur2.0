import { z } from "zod";

/** PDF uploads for PAN/GST/FSSAI (matches stock-location-extension validator). */
export const DOCUMENT_MAX_FILE_SIZE_BYTES = 3145728; // 3 MB

export enum AddressType {
  REGISTER = 1,
  BILLING = 2,
  SHIPPING = 3,
}

export enum LocationType {
  DARK_STORE = 1,
  OMNI = 2,
  HUB = 3,
}

export enum IsDelay {
  TRUE = 1,
  FALSE = 2,
}

export const StatusTypeMap: Record<number, string> = {
  1: "Active",
  2: "Inactive",
};

export const ServisibilityStatusTypeMap: Record<number, string> = {
  1: "Open",
  2: "Close",
  3: "Temporarily Close",
};

export const AddressTypeMap: Record<number, string> = {
  1: "Register",
  2: "Billing",
  3: "Shipping",
};

export const LocationTypeMap: Record<number, string> = {
  1: "Dark Store",
  2: "Omni",
  3: "Hub",
};

export const IsDelayOption: Record<number, string> = {
  1: "True",
  2: "False",
};

const FileSchema = z
  .object({
    file: z.object({
      name: z.string(),
      size: z
        .number()
        .optional()
        .refine((size) => !size || size <= DOCUMENT_MAX_FILE_SIZE_BYTES, {
          message: "File size must not exceed 3 MB",
        }),
      type: z.string().optional(),
    }),
    url: z.string().optional(),
    isThumbnail: z.boolean().optional(),
    base64Content: z.string().optional(),
  })
  .or(z.string());

/** Step-one / zilo `LocationNameSchema` + `LocationAddressSchema` alignment */
export const LocationNameFieldSchema = z.object({
  name: z.string().min(1, "Stock Location Name is required"),
});

export const LocationAddressFieldsSchema = z.object({
  address_1: z
    .string()
    .min(10, "Address should be at least 10 characters")
    .max(100, "Address should be at most 100 characters"),
  address_2: z.string().optional(),
  country_code: z.string().min(2, "Country is required").max(2),
  city: z.string().min(1, "City is required"),
  postal_code: z
    .string()
    .min(6, "Postal Code should be at least 6 characters")
    .max(6, "Postal Code should be at most 6 characters"),
  province: z.string().min(1, "State is required"),
  company: z.string().optional(),
  phone: z
    .string()
    .min(10, "Phone should be at least 10 characters")
    .max(10, "Phone should be at most 10 characters"),
});

export const CreateLocationSchema = LocationNameFieldSchema.merge(
  z.object({
    address: LocationAddressFieldsSchema,
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
    partner_wh_code: z.string().optional(),
    lead_time: z.string().optional(),
    managed_by: z.string().optional(),
    first_name: z.string().min(1, "First Name is required"),
    last_name: z.string().min(1, "Last Name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    is_delay: z.number().min(1, "Is Delay is required"),
    delay_value: z.string().optional(),
    delay_message: z.string().optional(),
    pan_number: z.string().min(10, "PAN Number should be at least 10 characters").max(10, "PAN Number should be at most 10 characters"),
    pan_pdf: z.array(FileSchema).min(1, "PAN PDF file is required"),
    gst_number: z.string().min(15, "GST Number should be at least 15 characters").max(15, "GST Number should be at most 15 characters"),
    gst_pdf: z.array(FileSchema).min(1, "GST PDF file is required"),
    fssai_number: z.string().min(1, "FSSAI Number is required"),
    fssai_pdf: z.array(FileSchema).min(1, "FSSAI PDF file is required"),
  })
);

/** Validates “Continue” from Basic Details — same rules as zilo `CreateLocationDetailsSchema` */
export const CreateLocationDetailsSchema = LocationNameFieldSchema.merge(
  z.object({ address: LocationAddressFieldsSchema })
).merge(
  z.object({
    latitude: z.string().min(1, "Latitude is required"),
    longitude: z.string().min(1, "Longitude is required"),
    status: z.number().min(1, "Status is required"),
    first_name: z.string().min(1, "First Name is required"),
    last_name: z.string().min(1, "Last Name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
  })
);

export const StepTwoConditionalSchema = z
  .object({
    seller_id: z.string().min(1),
    return_location_id: z.string().min(1),
    servisibility_status: z.number().min(1),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    partner_id: z.string().min(1),
    location_type: z.number().min(1),
    address_type: z.number().min(1),
    is_delay: z.number().min(1),
  })
  .refine(
    (data) => {
      if (!data.start_time || !data.end_time) return true;
      return data.start_time <= data.end_time;
    },
    { message: "End time must be greater than start time", path: ["end_time"] }
  );

export type CreateLocationSchemaType = z.infer<typeof CreateLocationSchema>;
