import { z } from "zod"

const httpOrPathUrl = z
  .string()
  .min(1, "File URL is required")
  .refine(
    (s) => /^https?:\/\//i.test(s.trim()) || s.trim().startsWith("/"),
    "Add a valid file URL or upload a document"
  )

const KycDocumentSchema = z.object({
  id: z.string().optional(),
  kyc_type: z.string().min(1, "KYC type is required"),
  value: z.string().min(1, "Value is required"),
  file_url: httpOrPathUrl,
})

const CompanySpocSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[0-9+\-\s()]+$/, "Phone number can only contain numbers and basic formatting characters"),
  type: z.enum(["Primary", "Secondary"]),
})

const BrandAssociationSchema = z.object({
  brand_id: z.string().min(1, "Brand ID is required"),
})

const BankDetailSchema = z.object({
  id: z.string().optional(),
  account_number: z.string().min(1, "Account number is required"),
  ifsc_code: z.string().min(1, "IFSC code is required"),
  bank_name: z.string().min(1, "Bank name is required"),
  branch_name: z.string().min(1, "Branch name is required"),
  account_type: z.enum(["SAVINGS", "CURRENT"]),
  entity_type: z.enum(["PRIVATE_LIMITED", "PROPRIETORSHIP", "PARTNERSHIP"]),
  account_verified: z.boolean(),
})

export const GeneralInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  display_name: z.string().min(1, "Display name is required"),
  entity_type: z.enum(["PRIVATE_LIMITED", "PROPRIETORSHIP", "PARTNERSHIP"], {
    required_error: "Please select an entity type",
  }),
  seller_type: z.enum(["BRAND", "SELLER", "DISTRIBUTOR"], {
    required_error: "Please select a seller type",
  }),
  msme: z.boolean(),
  description: z.string().min(1, "Description is required"),
})

export const ContactInfoSchema = z.object({
  email: z.string().email("Please enter a valid email address").min(1, "Email is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[0-9+\-\s()]+$/, "Phone number can only contain numbers and basic formatting characters"),
  address_line: z.string().min(1, "Address line is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country_code: z.string().min(1, "Country is required"),
  tax_id: z.string().min(1, "Tax ID is required"),
})

export const MemberInfoSchema = z.object({
  member: z.object({
    name: z.string().min(1, "Member name is required"),
    email: z.string().email("Please enter a valid email address").min(1, "Email is required"),
    bio: z.string().min(1, "Bio is required"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^[0-9+\-\s()]+$/, "Phone number can only contain numbers and basic formatting characters"),
    photo: z
      .union([
        z.string().refine(
          (s) => /^https?:\/\//i.test(s.trim()) || s.trim().startsWith("/"),
          "Please upload a valid photo"
        ),
        z.literal(""),
        z.null(),
      ])
      .optional(),
  }),
})

export const CompanySpocsSchema = z.object({
  company_spocs: z.array(CompanySpocSchema).min(1, "At least one SPOC is required"),
})

export const KycDocumentsSchema = z.object({
  kyc_documents: z.array(KycDocumentSchema).min(1, "At least one KYC document is required"),
})

export const BrandAssociationsSchema = z.object({
  brand_associations: z.array(BrandAssociationSchema).min(1, "At least one brand association is required"),
})

export const BankDetailsSchema = z.object({
  bank_detail: BankDetailSchema,
})

export const CreateSellerSchema = GeneralInfoSchema.merge(ContactInfoSchema)
  .merge(MemberInfoSchema)
  .merge(CompanySpocsSchema)
  .merge(KycDocumentsSchema)
  .merge(BrandAssociationsSchema)
  .merge(BankDetailsSchema)

export type CreateSellerSchemaType = z.infer<typeof CreateSellerSchema>

