import { StoreStatus } from "../../../types/seller/common"

/**
 * Maps seller module `status` to the admin UI `store_status` enum.
 */
export function mapModuleStatusToStoreStatus(
  status: string | undefined | null
): StoreStatus {
  const s = (status || "").toLowerCase()
  if (s === "open") return StoreStatus.ACTIVE
  if (s === "suspended" || s === "terminated") return StoreStatus.SUSPENDED
  return StoreStatus.INACTIVE
}

/**
 * Graph `seller` rows use `address` + `professional_details` relations.
 * Admin UI and onboarding payloads expect flat `phone`, `address_line`, etc.
 */
function pickStr(...vals: Array<string | null | undefined>): string {
  for (const v of vals) {
    if (v === undefined || v === null) continue
    const t = String(v).trim()
    if (t) return t
  }
  return ""
}

export function expandSellerGraphRowForAdmin(seller: Record<string, any> | null | undefined) {
  if (!seller) return seller

  const addr = seller.address
  const prof = seller.professional_details

  const addressFromRelation = [addr?.address_1, addr?.address_2].filter(Boolean).join(", ") || ""

  return {
    ...seller,
    phone: pickStr(addr?.phone, seller.phone),
    address_line: pickStr(addressFromRelation, seller.address_line),
    city: pickStr(addr?.city, seller.city),
    state: pickStr(addr?.province, seller.state),
    postal_code: pickStr(addr?.postal_code, seller.postal_code),
    country_code: pickStr(addr?.country_code, seller.country_code),
    tax_id: pickStr(prof?.tax_id, seller.tax_id),
    photo: seller.logo ?? seller.photo ?? null,
    store_status: mapModuleStatusToStoreStatus(seller.status),
  }
}
