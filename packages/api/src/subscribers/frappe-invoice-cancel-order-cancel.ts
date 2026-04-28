import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import axios from 'axios'
import {
  FRAPPE_BASE_URL,
  FRAPPE_ORDER_AUTH_TOKEN,
} from './utils/constants'

export default async function frappeCancelOrderHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (!FRAPPE_BASE_URL || !FRAPPE_ORDER_AUTH_TOKEN) {
    logger.warn(
      '[Frappe Cancel Order] Configuration missing: FRAPPE_BASE_URL and FRAPPE_ORDER_AUTH_TOKEN must be set'
    )
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { id: order_id } = event.data

  if (!order_id) {
    logger.warn('[Frappe Cancel Order] Missing order_id in event data')
    return
  }

  try {
    const { data: orderExtraDetails } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['id', 'invoice_id', 'marketplace_order_id'],
      filters: {
        order_id,
        deleted_at: { $eq: null },
      },
    })

    const orderExtraDetail = orderExtraDetails?.[0] as
      | { id: string; invoice_id: string | null; marketplace_order_id: string }
      | undefined

    if (!orderExtraDetail) {
      logger.warn(
        `[Frappe Cancel Order] No order_extra_detail found for order_id: ${order_id}`
      )
      return
    }

    if (orderExtraDetail.invoice_id == null || orderExtraDetail.invoice_id === '') {
      return
    }

    const marketPlaceOrderId = orderExtraDetail.marketplace_order_id;
    const cancelUrl = `${FRAPPE_BASE_URL}/api/method/frappe_zilo.integrations.order.cancel`

    logger.info(`[Frappe Cancel Order] Cancelling Invoice for order: ${marketPlaceOrderId}`)
    const response = await axios.post(
      cancelUrl,
      { market_place_order_id: marketPlaceOrderId },
      {
        headers: {
          Authorization: FRAPPE_ORDER_AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )
    logger.info(`[Frappe Cancel Order Invoice] Response: ${JSON.stringify(response.data)}`)

  } catch (error: unknown) {
    const axiosError = error as {
      response?: { status?: number; data?: unknown }
      message?: string
    }
    logger.error(
      `[Frappe Cancel Order] Failed to cancel order in Frappe: status=${axiosError?.response?.status}, data=${JSON.stringify(axiosError?.response?.data)}, message=${axiosError?.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: 'order.canceled',
  context: {
    subscriberId: 'frappe-cancel-order-handler',
  },
}
