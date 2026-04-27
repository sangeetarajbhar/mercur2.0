import { ICartModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

export const removeExtraChargeLineItemsStep = createStep(
  'remove-extra-charge-line-items',
  async (cartId: string, { container }) => {
    const cartService = container.resolve<ICartModuleService>(Modules.CART)

    // Get cart with line items
    const cart = await cartService.retrieveCart(cartId, {
      relations: ['items']
    })

    // Find extra charge line items
    const extraChargeLineItems =
      cart.items?.filter((item) => item.metadata?.is_extra_charge === true) ||
      []

    // Remove extra charge line items
    if (extraChargeLineItems.length > 0) {
      await cartService.deleteLineItems(
        extraChargeLineItems.map((item) => item.id)
      )
    }

    return new StepResponse(extraChargeLineItems.map((item) => item.id))
  }
)
