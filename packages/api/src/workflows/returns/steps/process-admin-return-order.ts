import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

interface ProcessAdminReturnOrderInput {
  orderId: string
  orderLineItemId: string
}

interface ProcessAdminReturnOrderOutput {
  orderId: string
  orderLineItemId: string
  orderLineItem: any
}

export const processAdminReturnOrderStep = createStep(
  'process-admin-return-order',
  async (
    input: ProcessAdminReturnOrderInput,
    { container }
  ): Promise<StepResponse<ProcessAdminReturnOrderOutput, any>> => {
    const { orderId, orderLineItemId } = input

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Get order line item details
    const { data: orderLineItems } = await query.graph({
      entity: 'order_line_item',
      fields: [
        'id',
        'quantity',
        'title',
        // 'order_id',
        'product_id',
        'variant_id',
        'unit_price',
        'subtotal',
        'total'
      ],
      filters: {
        id: orderLineItemId,
        // order_id: orderId
      }
    })

    if (!orderLineItems || orderLineItems.length === 0) {
      throw new Error(`Order line item with id ${orderLineItemId} not found in order ${orderId}`)
    }

    const orderLineItem = orderLineItems[0]

    return new StepResponse(
      {
        orderId,
        orderLineItemId,
        orderLineItem
      },
      {
        orderId,
        orderLineItemId
      }
    )
  },
  async (compensationData, { container }) => {
    // Compensation logic if needed
    if (!compensationData) {
      return
    }
    // Add any rollback logic here if needed
  }
)


