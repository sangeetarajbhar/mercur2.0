import { toHandle } from '@medusajs/framework/utils'
import { Modules } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { SELLER_MODULE, SellerModuleService } from '../../../modules/seller'
import { SellerEvents, StoreStatus } from '../../../types/seller'
import { generateUniqueBarcode } from '../../../api/admin/sellers/utils'


export interface UpdateSellerDTO {
  id: string
  name: string
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
  'update-seller',
  async (input: UpdateSellerDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)
    const eventBus = container.resolve(Modules.EVENT_BUS)

    const [previousData] = await service.listSellers({
      id: input.id
    })

    if (!previousData) {
      throw new Error(`Seller with id ${input.id} not found`)
    }

    const newHandle = input.name ? toHandle(input.name) : undefined

    // Handle barcode: only generate if seller doesn't have one
    // Once barcode is created, it should not change
    let barcode = input.barcode
    if (!barcode || (typeof barcode === 'string' && barcode.trim() === '')) {
      // If barcode is not provided in input, check if seller already has one
      if (previousData.barcode && previousData.barcode.trim() !== '') {
        // Seller already has a barcode, keep it
        barcode = previousData.barcode
      } else {
        // Seller doesn't have a barcode, generate a new one
        const nameToUse = input.name || previousData.name
        if (nameToUse && typeof nameToUse === 'string') {
          barcode = await generateUniqueBarcode(nameToUse, service)
        } else {
          // Fallback: generate with default prefix if name is not available
          barcode = await generateUniqueBarcode('SELLER', service)
        }
      }
    }

    const updatedSellers: SellerDTO = await service.updateSellers({
      ...input,
      barcode,
      ...(newHandle ? { handle: newHandle } : {})
    })

    // Emit seller updated event for Algolia sync
    await eventBus.emit({
      name: SellerEvents.SELLER_UPDATED,
      data: {
        id: input.id,
        seller: updatedSellers
      }
    })

    if (input.store_status) {
      await eventBus.emit({
        name: SellerEvents.STORE_STATUS_CHANGED,
        data: {
          id: input.id,
          store_status: input.store_status
        }
      })
    }

    return new StepResponse(updatedSellers, previousData as UpdateSellerDTO)
  },
  async (previousData: UpdateSellerDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    await service.updateSellers(previousData)
  }
)
