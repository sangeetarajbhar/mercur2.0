import { toHandle, Modules, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { CreateSellerDTO, SellerDTO, SellerEvents } from '../../../types/seller'
import { SellerModuleService, SELLER_MODULE } from '../../../modules/seller'

export const createSellerStep = createStep(
  'create-seller',
  async (input: CreateSellerDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)
    const eventBus = container.resolve(Modules.EVENT_BUS)

    const seller: SellerDTO = await service.createSellers({
      ...input,
      handle: toHandle(input.name)
    })

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
        'Seller ID is required for compensation'
      )
    }

    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    await service.softDeleteSellers([id])
  }
)
