import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../../../modules/order-line-item-extension'
import OrderLineItemExtensionModuleService from '../../../modules/order-line-item-extension/service'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

export interface UpdateLineItemStatusToReturnedInput {
  return_id: string
}

export const updateLineItemStatusToReturnedStep = createStep(
  'update-line-item-status-to-returned',
  async (
    input: UpdateLineItemStatusToReturnedInput,
    { container }
  ): Promise<StepResponse<void>> => {
    const { return_id } = input
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Get return items
    const { data: returnItems } = await query.graph({
      entity: "return",
      fields: ["items.*", "id"],
      filters: {
        id: return_id,
      },
    })

    if (!returnItems || returnItems.length === 0 || !returnItems[0].items?.[0]?.item_id) {
      return new StepResponse(undefined)
    }

    const itemId = returnItems[0].items[0].item_id

    const orderLineItemExtensionService = container.resolve(ORDER_LINE_ITEM_EXTENSION_MODULE) as OrderLineItemExtensionModuleService

    await orderLineItemExtensionService.updateOrderLineItemExtensions({
      selector: {
        order_line_item_id: itemId
      },
      data: {
        status: OrderLineItemStatus.RETURNED,
      }
    })

    return new StepResponse(undefined)
  }
)

