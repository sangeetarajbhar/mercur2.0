import { Modules, toHandle } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import { SellerEvents, StoreStatus } from "../../../types/seller"
import { generateUniqueBarcode } from "../../../api/admin/sellers/utils"

const SELLER_MODULE = "seller"
type SellerModuleService = any

export interface UpdateSellerDTO {
  id: string
  /** Omitted on partial onboarding updates (e.g. bank tab only). */
  name?: string
  display_name?: string
  barcode?: string
  entity_type?: "PRIVATE_LIMITED" | "PROPRIETORSHIP" | "PARTNERSHIP" | null
  msme?: boolean
  seller_type?: "BRAND" | "SELLER" | "DISTRIBUTOR" | null
  description?: string
  email?: string
  phone?: string
  address_line?: string
  city?: string
  state?: string
  postal_code?: string
  country_code?: string
  store_status?: StoreStatus
  tax_id?: string
}

export type SellerDTO = {
  id: string
  store_status: StoreStatus
  created_at: Date
  updated_at: Date
  name: string
  email: string | null
  phone: string | null
  description: string | null
  address_line: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country_code: string | null
  tax_id: string | null
  handle: string
  members?: any[]
  company_spocs?: any[]
  kyc_documents?: any[]
  brand_associations?: any[]
  bank_detail?: any
}

export const updateAdminSellerStep = createStep(
  "update-seller",
  async (input: UpdateSellerDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)
    const eventBus = container.resolve(Modules.EVENT_BUS)

    const [previousData] = await service.listSellers({
      id: input.id,
    })

    if (!previousData) {
      throw new Error(`Seller with id ${input.id} not found`)
    }

    const prev = previousData as any

    const trimmedName =
      input.name !== undefined ? String(input.name).trim() : undefined
    const newHandle = trimmedName ? toHandle(trimmedName) : undefined

    let barcode = input.barcode
    if (!barcode || (typeof barcode === "string" && barcode.trim() === "")) {
      if (prev.barcode && String(prev.barcode).trim() !== "") {
        barcode = prev.barcode
      } else {
        const nameToUse = trimmedName || prev.name
        barcode = await generateUniqueBarcode(nameToUse || "SELLER", service as any)
      }
    }

    // Only persist columns that exist on `Seller`. Contact + tax live on
    // `seller_address` / `professional_details` (updated by separate workflows).
    // MikroORM validates required Seller scalars on flush — merge from DB when omitted
    // (e.g. client only sends display_name or JSON drops `name`).
    const resolvedName =
      trimmedName !== undefined ? trimmedName || prev.name : prev.name

    const sellerRowPatch: Record<string, unknown> = {
      id: input.id,
      name: resolvedName,
      handle: newHandle ?? prev.handle,
      email: input.email !== undefined ? input.email : prev.email,
      currency_code: prev.currency_code,
      status: prev.status,
      barcode,
    }

    const optionalSellerScalars: (keyof UpdateSellerDTO)[] = [
      "display_name",
      "description",
      "entity_type",
      "msme",
      "seller_type",
    ]

    for (const key of optionalSellerScalars) {
      if (input[key] !== undefined) {
        sellerRowPatch[key] = input[key]
      }
    }

    const updatedSeller: SellerDTO = (await (service as any).updateSellers(
      sellerRowPatch
    )) as SellerDTO

    await eventBus.emit({
      name: SellerEvents.SELLER_UPDATED,
      data: {
        id: input.id,
        seller: updatedSeller,
      },
    })

    if (input.store_status) {
      await eventBus.emit({
        name: SellerEvents.STORE_STATUS_CHANGED,
        data: {
          id: input.id,
          store_status: input.store_status,
        },
      })
    }

    return new StepResponse(updatedSeller, previousData as UpdateSellerDTO)
  },
  async (previousData: UpdateSellerDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)
    await (service as any).updateSellers(previousData)
  }
)

