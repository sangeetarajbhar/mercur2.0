import { toHandle, Modules, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { SELLER_MODULE, SellerModuleService} from '../../../modules/seller'
import { SellerEvents, StoreStatus } from '../../../types/seller'
import { BRAND_MODULE } from '../../../modules/brand'
import { generateUniqueBarcode } from '../../../api/admin/sellers/utils'



type CreateAdminSellerOnboardingInput = {
    // Define the input type based on your JSON structure
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
    tax_id?: string
    member: any
    company_spocs: any[]
    kyc_documents: any[]
    brand_associations: any[]
    bank_detail: any
  }

export const createAdminSellerStep = createStep(
  'create-admin-seller',
  async (input: CreateAdminSellerOnboardingInput, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)
    const eventBus = container.resolve(Modules.EVENT_BUS)
    const link = container.resolve("link")

    // Exclude nested arrays/objects to prevent duplicates
    // These will be created by dedicated workflow steps
    const {
      company_spocs,
      kyc_documents,
      bank_detail,
      brand_associations,
      member,
      ...sellerPayload
    } = input

    // Generate unique barcode if not provided
    const barcode = input.barcode || await generateUniqueBarcode(input.name, service)

    const seller: any = await service.createSellers({
      ...sellerPayload,
      barcode,
      members: member,
      store_status: StoreStatus.INACTIVE,
      handle: toHandle(input.name)
    })

        // 2. Link seller to brands using the module link
        if (input.brand_associations && input.brand_associations.length > 0) {
          // Filter out any invalid brand associations
          const validBrandAssociations = input.brand_associations.filter(ba => ba && ba.brand_id)
          
          const linksToCreate = validBrandAssociations.map((ba) => ({
            [SELLER_MODULE]: { seller_id: seller.id },
            [BRAND_MODULE]: { brand_id: ba.brand_id }
          }))
          // Create links one by one
          if (linksToCreate.length) {
            await link.create(linksToCreate)
          }
        }
    
    await eventBus.emit({
      name: SellerEvents.SELLER_CREATED,
      data: {
        id: seller.id,
        seller: seller
      }
    })

    return new StepResponse(seller, seller.id)
  },
  async (id: string, { container }) => {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Admin seller ID is required for compensation'
      )
    }

    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    await service.softDeleteSellers([id])
  }
)
