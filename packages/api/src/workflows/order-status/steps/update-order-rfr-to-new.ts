import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Knex } from 'knex'

import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../../../modules/order-line-item-extension'
import OrderLineItemExtensionModuleService from '../../../modules/order-line-item-extension/service'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

/**
 * Helper function to update order status using Knex
 * This follows the same pattern as executeOrderStatusUpdate in update-order-status.ts
 */
const executeOrderStatusUpdate = async (
  knex: Knex,
  status: string,
  orderId: string
): Promise<void> => {
  if (!knex || typeof knex !== 'function') {
    throw new Error('Database connection unavailable while updating order status')
  }

  await knex('order').where({ id: orderId }).update({ status })
}

export interface UpdateOrderRfrToNewInput {
  orderId: string
  lineItemExtensionIds: string[]
}

export interface UpdateOrderRfrToNewOutput {
  orderId: string
  updatedLineItemsCount: number
}

interface UpdateOrderRfrToNewCompensationData {
  orderId: string
  previousStatus: string
  lineItemExtensionIds: string[]
}

export const updateOrderRfrToNewStep = createStep(
  'update-order-rfr-to-new',
  async (input: UpdateOrderRfrToNewInput, { container }) => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      ORDER_LINE_ITEM_EXTENSION_MODULE
    )

    // 1. Update all line item extensions to NEW
    const extensionUpdates = input.lineItemExtensionIds.map((id: string) => ({
      id,
      status: OrderLineItemStatus.NEW
    }))

    await orderLineItemExtensionModule.updateOrderLineItemExtensions(extensionUpdates)

    // 2. Update order status to NEW using helper function
    await executeOrderStatusUpdate(knex, OrderLineItemStatus.NEW, input.orderId)

    const compensationData: UpdateOrderRfrToNewCompensationData = {
      orderId: input.orderId,
      previousStatus: OrderLineItemStatus.RFR,
      lineItemExtensionIds: input.lineItemExtensionIds
    }

    return new StepResponse<UpdateOrderRfrToNewOutput, UpdateOrderRfrToNewCompensationData>({
      orderId: input.orderId,
      updatedLineItemsCount: extensionUpdates.length
    }, compensationData)
  },
  async (compensationData: UpdateOrderRfrToNewCompensationData, { container }) => {
    if (!compensationData) {
      return
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      ORDER_LINE_ITEM_EXTENSION_MODULE
    )

    // Revert order status using helper function
    await executeOrderStatusUpdate(knex, compensationData.previousStatus, compensationData.orderId)

    // Revert line item extensions
    const revertUpdates = compensationData.lineItemExtensionIds.map((id: string) => ({
      id,
      status: OrderLineItemStatus.RFR
    }))

    await orderLineItemExtensionModule.updateOrderLineItemExtensions(revertUpdates)
  }
)

