import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import orderSetOrder from '../../../links/order-set-order'
import { cancelFulfillmentWorkflow } from '../../fulfillment/workflows'

export type CancelFulfillmentsForOrderSetInput = {
  order_set_id: string
}

/**
 * Cancels all fulfillments for an order-set by:
 * 1. Getting all order IDs in the order-set via order_set_order link
 * 2. Getting all fulfillment IDs for those orders via order_fulfillment link
 * 3. Running cancelFulfillmentWorkflow for each fulfillment
 */
export const cancelFulfillmentsForOrderSetStep = createStep(
  'cancel-fulfillments-for-order-set',
  async (
    input: CancelFulfillmentsForOrderSetInput,
    { container }
  ): Promise<StepResponse<{ fulfillmentIds: string[] }>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: orderLinks } = await query.graph({
      entity: orderSetOrder.entryPoint,
      fields: ['order_id'],
      filters: {
        order_set_id: input.order_set_id,
      },
    })

    const orderIds = (orderLinks || [])
      .map((link: { order_id?: string }) => link.order_id)
      .filter((id): id is string => Boolean(id))

    if (!orderIds.length) {
      return new StepResponse({ fulfillmentIds: [] })
    }

    const { data: orderFulfillments } = await query.graph({
      entity: 'order_fulfillment',
      fields: ['fulfillment_id'],
      filters: {
        order_id: orderIds,
      },
    })

    const fulfillmentIds = (orderFulfillments || [])
      .map((row: { fulfillment_id?: string }) => row.fulfillment_id)
      .filter((id): id is string => Boolean(id))

    const workflow = cancelFulfillmentWorkflow(container)
    for (const fulfillmentId of fulfillmentIds) {
      await workflow.run({
        input: { id: fulfillmentId },
      })
    }

    return new StepResponse({ fulfillmentIds })
  }
)
