import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AdminGetStockLocationParamsType } from "../validators"
import { HttpTypes } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { refetchStockLocation } from "../helpers"

const normalizeAddress = (address: Record<string, any> = {}) => ({
  id: address.id ?? null,
  address_1: address.address_1 ?? "",
  address_2: address.address_2 ?? "",
  company: address.company ?? "",
  city: address.city ?? "",
  country_code: address.country_code ?? "",
  phone: address.phone ?? "",
  province: address.province ?? "",
  postal_code: address.postal_code ?? "",
  metadata: address.metadata ?? null,
  created_at: address.created_at ?? null,
  updated_at: address.updated_at ?? null,
  deleted_at: address.deleted_at ?? null,
})

const normalizeSeller = (seller: Record<string, any> = {}) => ({
  id: seller.id ?? null,
  store_status: seller.store_status ?? (seller.status ? String(seller.status).toUpperCase() : null),
  name: seller.name ?? "",
  handle: seller.handle ?? "",
  description: seller.description ?? null,
  photo: seller.photo ?? seller.logo ?? null,
  email: seller.email ?? null,
  phone: seller.phone ?? null,
  address_line: seller.address_line ?? seller.address_1 ?? null,
  city: seller.city ?? null,
  state: seller.state ?? seller.province ?? null,
  postal_code: seller.postal_code ?? null,
  country_code: seller.country_code ?? null,
  tax_id: seller.tax_id ?? null,
  display_name: seller.display_name ?? seller.name ?? null,
  barcode: seller.barcode ?? null,
  entity_type: seller.entity_type ?? null,
  msme: seller.msme ?? null,
  seller_type: seller.seller_type ?? null,
  onboarding: seller.onboarding ?? null,
  bank_detail: seller.bank_detail ?? null,
  created_at: seller.created_at ?? null,
  updated_at: seller.updated_at ?? null,
  deleted_at: seller.deleted_at ?? null,
})

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetStockLocationParamsType>,
  res: MedusaResponse<HttpTypes.AdminStockLocationResponse>
) => {
  const { id } = req.params

  const stockLocation = await refetchStockLocation(
    id,
    req.scope,
    req.queryConfig.fields
  )

  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Stock location with id: ${id} was not found`
    )
  }

  // Append the S3 url
  const S3_BASE_URL = process.env.S3_FILE_URL
  if (stockLocation?.stock_location_section?.stock_location_documents && Array.isArray(stockLocation.stock_location_section.stock_location_documents)) {
    stockLocation.stock_location_section.stock_location_documents =
      stockLocation.stock_location_section.stock_location_documents.map((doc) => ({
        ...doc,
        pdf_url: doc.pdf_url
          ? /^(https?:\/\/|data:)/i.test(doc.pdf_url)
            ? doc.pdf_url
            : `${S3_BASE_URL}/${doc.pdf_url.replace(/^\/+/, '')}`
          : doc.pdf_url,
      }))
  }

  // Normalize response shape to match live payload structure.
  stockLocation.address = normalizeAddress(stockLocation.address)
  stockLocation.seller = normalizeSeller(stockLocation.seller)

  res.status(200).json({ stock_location: stockLocation })
}
