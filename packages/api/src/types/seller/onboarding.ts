/**
 * Admin “create seller onboarding” workflow payloads (aligned with seller module models).
 */

export type AdminSellerEntityType = "PRIVATE_LIMITED" | "PROPRIETORSHIP" | "PARTNERSHIP"

export type AdminSellerType = "BRAND" | "SELLER" | "DISTRIBUTOR"

export type KycDocumentType =
  | "PAN"
  | "TAN"
  | "NOODLE_LETTER"
  | "SIGNATURE"
  | "COI"
  | "INVOICE_GUIDELINE"
  | "CANCELLED_CHEQUE"
  | "AGREEMENT"
  | "TRADEMARK"
  | "SIN_NUMBER"
  | "GST_CERTIFICATE"
  | "MSME_CERTIFICATE"
  | "OTHERS"

export type CompanySpocType = "Primary" | "Secondary"

/** Member row fields accepted when nesting members on seller create (see `Member` model). */
export type CreateAdminSellerMemberInput = {
  email: string
  name: string
  locale?: string | null
  is_active?: boolean
  bio?: string | null
  phone?: string | null
  photo?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Initial member(s) for the seller. Passed through as `members` on `createSellers` (single or list).
 */
export type CreateAdminSellerOnboardingMember =
  | CreateAdminSellerMemberInput
  | CreateAdminSellerMemberInput[]

/** Payload for `createCompanySpocsStep` (see `company_spoc` model). */
export type CreateCompanySpocOnboardingInput = {
  first_name: string
  last_name: string
  email: string
  phone: string
  type?: CompanySpocType | null
}

/** Payload for `createKycDocumentsStep` (see `kyc_document` model). */
export type CreateKycDocumentOnboardingInput = {
  kyc_type: KycDocumentType
  value: string
  file_url?: string
}

/** Link seller ↔ brand in `createAdminSellerStep`. */
export type BrandAssociationOnboardingInput = {
  brand_id: string
}

/** Payload for `createBankDetailStep` (see `bank_detail` model). */
export type CreateBankDetailOnboardingInput = {
  account_number: string
  ifsc_code?: string
  bank_name?: string
  branch_name?: string
  account_type?: "SAVINGS" | "CURRENT"
  entity_type?: AdminSellerEntityType
  account_verified?: boolean
}

export type CreateAdminSellerOnboardingInput = {
  currency_code: string
  name: string
  display_name?: string
  barcode?: string
  entity_type?: AdminSellerEntityType | null
  msme?: boolean
  seller_type?: AdminSellerType | null
  description?: string
  email?: string
  phone?: string
  address_line?: string
  city?: string
  state?: string
  postal_code?: string
  country_code?: string
  tax_id?: string
  member: CreateAdminSellerOnboardingMember
  company_spocs: CreateCompanySpocOnboardingInput[]
  kyc_documents: CreateKycDocumentOnboardingInput[]
  brand_associations: BrandAssociationOnboardingInput[]
  bank_detail?: CreateBankDetailOnboardingInput | null
  auth_identity_id: string
}
