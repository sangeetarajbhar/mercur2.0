import type { CreateSellerSchemaType } from "./schema"
import { countries, getCountryByIso2 } from "../../../lib/data/countries"

const emptyCompanySpoc = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  type: "Primary" as const,
}

const emptyKyc = { kyc_type: "", value: "", file_url: "" }

const emptyBank = {
  account_number: "",
  ifsc_code: "",
  bank_name: "",
  branch_name: "",
  account_type: "SAVINGS" as const,
  entity_type: "PRIVATE_LIMITED" as const,
  account_verified: false,
}

export const createEmptySellerForm = (): CreateSellerSchemaType => ({
  name: "",
  display_name: "",
  entity_type: "PRIVATE_LIMITED",
  seller_type: "SELLER",
  msme: false,
  description: "",
  email: "",
  phone: "",
  address_line: "",
  city: "",
  state: "",
  postal_code: "",
  country_code: "",
  tax_id: "",
  member: { name: "", email: "", bio: "", phone: "", photo: null },
  company_spocs: [{ ...emptyCompanySpoc }],
  kyc_documents: [{ ...emptyKyc }],
  brand_associations: [],
  bank_detail: { ...emptyBank },
})

function normalizeSpocType(t: unknown): "Primary" | "Secondary" {
  const s = String(t ?? "Primary").toLowerCase()
  return s === "secondary" ? "Secondary" : "Primary"
}

/**
 * Country options for selects: full ISO-3166 alpha-2 list from `lib/data/countries`,
 * plus the seller’s current code if it is missing from that dataset.
 */
export function getCountrySelectOptions(iso2: string | undefined): { value: string; label: string }[] {
  const base = countries
    .map((c) => ({ value: c.iso_2.toLowerCase(), label: c.display_name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const raw = (iso2 || "").trim().toLowerCase()
  if (!raw || base.some((o) => o.value === raw)) return base

  const found = getCountryByIso2(raw)
  return [...base, { value: raw, label: found?.display_name ?? raw.toUpperCase() }].sort((a, b) =>
    a.label.localeCompare(b.label)
  )
}

export function sellerApiToFormValues(seller: any): CreateSellerSchemaType {
  if (!seller) return createEmptySellerForm()

  const companySpocsRaw = seller.company_spocs || []
  const company_spocs =
    companySpocsRaw.length > 0
      ? companySpocsRaw.map((spoc: any) => ({
          ...(spoc.id && { id: spoc.id }),
          first_name: spoc.first_name || "",
          last_name: spoc.last_name || "",
          email: spoc.email || "",
          phone: spoc.phone || "",
          type: normalizeSpocType(spoc.type),
        }))
      : [{ ...emptyCompanySpoc }]

  const kycRaw = seller.kyc_documents || []
  const kyc_documents =
    kycRaw.length > 0
      ? kycRaw.map((doc: any) => ({
          ...(doc.id && { id: doc.id }),
          kyc_type: doc.kyc_type || "",
          value: doc.value || "",
          file_url: doc.file_url || "",
        }))
      : [{ ...emptyKyc }]

  return {
    ...createEmptySellerForm(),
    name: seller.name || "",
    display_name: seller.display_name || "",
    entity_type: seller.entity_type || "PRIVATE_LIMITED",
    seller_type: seller.seller_type || "SELLER",
    msme: Boolean(seller.msme),
    description: seller.description || "",
    email: seller.email || "",
    phone: seller.phone || "",
    address_line: seller.address_line || "",
    city: seller.city || "",
    state: seller.state || "",
    postal_code: seller.postal_code || "",
    country_code: (seller.country_code || "").toLowerCase(),
    tax_id: seller.tax_id || "",
    member: seller.members?.[0]
      ? {
          name: seller.members[0].name || "",
          email: seller.members[0].email || "",
          bio: seller.members[0].bio || "",
          phone: seller.members[0].phone || "",
          photo: seller.members[0].photo ?? null,
        }
      : { name: "", email: "", bio: "", phone: "", photo: null },
    company_spocs,
    kyc_documents,
    brand_associations: (seller.brand_associations || []).map((ba: any) => ({
      brand_id: ba.brand_id || ba.id,
      name: ba.name,
      handle: ba.handle,
    })),
    bank_detail: seller.bank_detail
      ? {
          ...(seller.bank_detail.id && { id: seller.bank_detail.id }),
          account_number: seller.bank_detail.account_number || "",
          ifsc_code: seller.bank_detail.ifsc_code || "",
          bank_name: seller.bank_detail.bank_name || "",
          branch_name: seller.bank_detail.branch_name || "",
          account_type: seller.bank_detail.account_type || "SAVINGS",
          entity_type: seller.bank_detail.entity_type || "PRIVATE_LIMITED",
          account_verified: Boolean(seller.bank_detail.account_verified),
        }
      : { ...emptyBank },
  }
}
