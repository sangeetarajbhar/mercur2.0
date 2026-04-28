import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import axios from 'axios'
import {
  FRAPPE_BASE_URL,
  FRAPPE_ORDER_AUTH_TOKEN,
} from './utils/constants'

export default async function frappeCancelReturnHandler({
  event,
  container,
}: SubscriberArgs<{ return_id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!FRAPPE_BASE_URL || !FRAPPE_ORDER_AUTH_TOKEN) {
    logger.warn(
      '[Frappe Cancel Return] Configuration missing: FRAPPE_BASE_URL and FRAPPE_ORDER_AUTH_TOKEN must be set'
    )
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { return_id } = event.data

  if (!return_id) {
    logger.warn('[Frappe Cancel Return] Missing return_id in event data')
    return
  }

  try {
    const { data: returns } = await query.graph({
      entity: 'return',
      fields: ['id', 'order_id', 'items.item_id'],
      filters: {
        id: return_id,
      },
    })

    const returnRecord = returns?.[0] as
      | { id: string; order_id: string; items: { item_id: string }[] }
      | undefined

    if (!returnRecord?.order_id) {
      logger.warn(
        `[Frappe Cancel Return] No return found for return_id: ${return_id}`
      )
      return
    }

    const lineItemId = returnRecord.items?.[0]?.item_id

    if (!lineItemId) {
      logger.warn(
        `[Frappe Cancel Return] No line item ID found for return_id: ${return_id}`
      )
      return
    }

    const { data: orderExtraDetails } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['id', 'invoice_id', 'marketplace_order_id'],
      filters: {
        order_id: returnRecord.order_id,
        deleted_at: { $eq: null },
      },
    })

    const orderExtraDetail = orderExtraDetails?.[0] as
      | { id: string; invoice_id: string | null; marketplace_order_id: string }
      | undefined

    if (!orderExtraDetail) {
      logger.warn(
        `[Frappe Cancel Return] No order_extra_detail found for order_id: ${returnRecord.order_id}`
      )
      return
    }

    if (orderExtraDetail.invoice_id == null || orderExtraDetail.invoice_id === '') {
      return
    }

    const cancelUrl = `${FRAPPE_BASE_URL}/api/method/frappe_zilo.integrations.order.cancel`

    await axios.post(
      cancelUrl,
      {
        market_place_order_id: orderExtraDetail.marketplace_order_id,
        line_ids: [lineItemId],
      },
      {
        headers: {
          Authorization: FRAPPE_ORDER_AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )

    logger.info(
      `[Frappe Cancel Return] Successfully called Frappe cancel for return_id: ${return_id}, line_item_id: ${lineItemId}`
    )
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { status?: number; data?: unknown }
      message?: string
    }
    logger.error(
      `[Frappe Cancel Return] Failed to cancel invoice for return in Frappe: status=${axiosError?.response?.status}, data=${JSON.stringify(axiosError?.response?.data)}, message=${axiosError?.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: 'return_items_received',
  context: {
    subscriberId: 'frappe-cancel-return-handler',
  },
}
