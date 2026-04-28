import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import OrderLineItemExtensionModuleService from '../../../modules/order-line-item-extension/service'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

interface UpdateLineItemExtensionStatusInput {
  validatedLineItems: Array<{
    lineItemId: string
    orderLineItemExtensionId: string
    currentStatus: string
    reason?: string
    reasonCode?: string
  }>
  status: string
}

export const updateLineItemExtensionStatusStep = createStep(
  'update-line-item-extension-status',
  async (input: UpdateLineItemExtensionStatusInput, { container }) => {
    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      'order_line_item_extension'
    )

    const updates: any[] = []
    const compensationData: any[] = []
    const isRejected = input.status === OrderLineItemStatus.REJECTED
    const persistedStatus = isRejected
      ? OrderLineItemStatus.CANCELLED
      : input.status

    for (const item of input.validatedLineItems) {
      compensationData.push({
        id: item.orderLineItemExtensionId,
        currentStatus: item.currentStatus,
        newStatus: persistedStatus,
        setRejectedFields: isRejected
      })

      const updateData: any = {
        id: item.orderLineItemExtensionId,
        status: persistedStatus
      }

      if (isRejected) {
        const now = new Date()
        updateData.rejected_at = now
        updateData.cancelled_at = now
      }

      if (
        input.status === OrderLineItemStatus.REJECTED ||
        input.status === OrderLineItemStatus.CANCELLED
      ) {
        updateData.reason = item.reason
        updateData.reason_code = item.reasonCode
      }

      const [updated] = await orderLineItemExtensionModule.updateOrderLineItemExtensions([
        updateData
      ])
      updates.push(updated)
    }

    return new StepResponse(updates, compensationData)
  },
  async (compensationData, { container }) => {
    if (!compensationData || compensationData.length === 0) return

    const orderLineItemExtensionModule = container.resolve<OrderLineItemExtensionModuleService>(
      'order_line_item_extension'
    )

    for (const item of compensationData) {
      const revertData: any = {
        id: item.id,
        status: item.currentStatus
      }

      if (item.newStatus === OrderLineItemStatus.REJECTED || item.newStatus === OrderLineItemStatus.CANCELLED) {
        revertData.reason = null
        revertData.reason_code = null
      }

      if (item.setRejectedFields) {
        revertData.rejected_at = null
        revertData.cancelled_at = null
      }

      await orderLineItemExtensionModule.updateOrderLineItemExtensions([
        revertData
      ])
    }
  }
)

