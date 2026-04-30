import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export interface FetchReturnWithOrderDetailsInput {
  return_id: string
}

export interface FetchReturnWithOrderDetailsOutput {
  orderReturn: {
    id: string
    order_id: string
    status: string
    refund_amount: number
    items: Array<{
      id: string
      item_id: string
      quantity: number
    }>
  }
  order: {
    id: string
    items: Array<{
      id: string
      order_line_item_extension?: {
        item_total: number
      }
    }>
    payment_collections: Array<{
      payment_sessions: Array<{
        provider_id: string
        payment?: {
          id: string
        }
      }>
    }>
    split_order_payment?: {
      id: string
    }
  }
  receiveItems: Array<{
    id: string
    quantity: number
  }>
}

export const fetchReturnWithOrderDetailsStep = createStep(
  "fetch-return-with-order-details",
  async (
    input: FetchReturnWithOrderDetailsInput,
    { container }
  ): Promise<StepResponse<FetchReturnWithOrderDetailsOutput>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Fetch the return with its items
    const { data: returns } = await query.graph({
      entity: "return",
      fields: [
        "id",
        "order_id",
        "status",
        "refund_amount",
        "items.id",
        "items.item_id",
        "items.quantity",
      ],
      filters: {
        id: input.return_id,
      },
    })

    const orderReturn = returns?.[0]

    if (!orderReturn) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Return with id ${input.return_id} not found`
      )
    }

    // Check if return is already refunded
    if (orderReturn.status === "refunded") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Return ${input.return_id} is already refunded`
      )
    }

    // Fetch the order with payment details
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "items.id",
        "items.order_line_item_extension.item_total",
        "payment_collections.payment_sessions.provider_id",
        "payment_collections.payment_sessions.payment.id",
        "split_order_payment.id",
      ],
      filters: {
        id: orderReturn.order_id,
      },
    })

    const order = orders?.[0]

    if (!order) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order with id ${orderReturn.order_id} not found`
      )
    }

    // Prepare items for receive workflow
    const receiveItems = orderReturn.items?.map((item: any) => ({
      id: item.item_id,
      quantity: item.quantity,
    })) || []

    return new StepResponse({
      orderReturn: orderReturn as any,
      order: order as any,
      receiveItems,
    })
  }
)
