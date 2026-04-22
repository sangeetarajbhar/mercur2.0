import {
  CreateLineItemForCartDTO,
  ICartModuleService,
} from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import SELLER_MODULE from '../../../modules/seller'
import { MercurModules } from "@mercurjs/types"

/**
 * The details of the line items to create.
 */

export interface ExtendedLineItem extends CreateLineItemForCartDTO {
  seller_id: string
}
export interface CreateLineItemsCartStepInput {
  /**
   * The ID of the cart to create line items for.
   */
  id: string
  /**
   * The line items to create.
   */
  items: ExtendedLineItem[]
}

export const createLineItemsStepId = "create-line-items-step"
/**
 * This step creates line item in a cart.
 *
 * @example
 * const data = createLineItemsStep({
 *   "id": "cart_123",
 *   "items": [{
 *     "title": "Shirt",
 *     "quantity": 1,
 *     "unit_price": 20,
 *     "cart_id": "cart_123",
 *   }]
 * })
 */
export const createLineItemsStep = createStep(
  createLineItemsStepId,
  async (data: CreateLineItemsCartStepInput, { container }) => {
    const cartModule = container.resolve<ICartModuleService>(Modules.CART)
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    const sellerIds = data.items.map((item) => item?.seller_id)

    const createdItems = data.items.length
      ? await cartModule.addLineItems(data.items as CreateLineItemForCartDTO[])
      : []

      // seller line item link 
        const links = createdItems.map((item) => ({
          [MercurModules.SELLER]: { seller_id: sellerIds[0] }, 
          [Modules.CART]: { line_item_id: item?.id },
        }))

        await remoteLink.create(links)
      // seller line item link 
    return new StepResponse(createdItems, createdItems)
  },
  async (createdItems, { container }) => {
    if (!createdItems?.length) {
      return
    }

    const cartModule: ICartModuleService = container.resolve(Modules.CART)

    await cartModule.deleteLineItems(createdItems.map((c) => c.id))
  }
)
