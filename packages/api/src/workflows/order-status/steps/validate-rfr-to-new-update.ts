import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

export interface ValidateRfrToNewUpdateInput {
  marketplaceOrderId: string
}

export interface ValidateRfrToNewUpdateOutput {
  orderId: string
  lineItemIds: string[]
  lineItemExtensionIds: string[]
  skipStatusUpdate?: boolean
}

export const validateRfrToNewUpdateStep = createStep(
  'validate-rfr-to-new-update',
  async (input: ValidateRfrToNewUpdateInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // 1. Get order_id from marketplace_order_id
    const { data: orderExtraDetail } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['order_id'],
      filters: {
        marketplace_order_id: input.marketplaceOrderId
      }
    })

    if (!orderExtraDetail || orderExtraDetail.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order not found for marketplace order ID: ${input.marketplaceOrderId}`
      )
    }

    const orderId = orderExtraDetail[0].order_id

    // 2. Get order with status and line items
    const { data: orderData } = await query.graph({
      entity: 'order',
      fields: ['id', 'status', 'items.id'],
      filters: {
        id: orderId
      }
    })

    if (!orderData || orderData.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order not found with ID: ${orderId}`
      )
    }

    const order = orderData[0]

    // 3. Extract line item IDs
    const orderItems = order.items || []
    const lineItemIds = orderItems.map((item: any) => item.id)

    if (lineItemIds.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No line items found for order: ${orderId}`
      )
    }

    // 4. Get all line item extensions
    const { data: lineItemExtensions } = await query.graph({
      entity: 'order_line_item_extension',
      fields: ['id', 'order_line_item_id', 'status'],
      filters: {
        order_line_item_id: lineItemIds
      }
    })

    if (!lineItemExtensions || lineItemExtensions.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `No line item extensions found for order: ${orderId}`
      )
    }

    // 5. Check if order is already NEW (idempotent request)
    if (order?.status === OrderLineItemStatus.NEW as any) {
      const lineItemExtensionIds = lineItemExtensions.map((ext: any) => ext.id)
      return new StepResponse<ValidateRfrToNewUpdateOutput>({
        orderId,
        lineItemIds,
        lineItemExtensionIds,
        skipStatusUpdate: true
      })
    }

    // 6. Validate order status is RFR
    if (order?.status !== OrderLineItemStatus.RFR as any) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order status must be RFR to transition to NEW. Current status: ${order.status}`
      )
    }

    // 7. Validate all line items have status RFR
    const nonRfrExtensions = lineItemExtensions.filter(
      (ext: any) => ext.status !== OrderLineItemStatus.RFR
    )

    if (nonRfrExtensions.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `All line items must have status RFR to transition to NEW. Found ${nonRfrExtensions.length} line item(s) with different status.`
      )
    }

    const lineItemExtensionIds = lineItemExtensions.map((ext: any) => ext.id)

    return new StepResponse<ValidateRfrToNewUpdateOutput>({
      orderId,
      lineItemIds,
      lineItemExtensionIds,
      skipStatusUpdate: false
    })
  }
)

