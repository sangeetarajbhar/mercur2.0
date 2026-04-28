import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { toPostgresFormat } from '../shared/utils'
import { getStartOfDayIST } from '../workflows/delivery-promise/utils/date-time-utils'
import orderSetOrder from '../links/order-set-order'

export default async function orderSetDeliveredReturnEndDateHandler({
  event: { data },
  container
}: SubscriberArgs<{ order_set_id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { order_set_id } = data

  if (!order_set_id) {
    return
  }

  // Get order IDs for this order set
  const { data: orderLinks } = await query.graph({
    entity: orderSetOrder.entryPoint,
    fields: ['order_id'],
    filters: {
      order_set_id
    }
  })

  const orderIds = (orderLinks || [])
    .map((link: { order_id?: string }) => link.order_id)
    .filter((id): id is string => Boolean(id))

  if (!orderIds.length) {
    return
  }

  // Get line item IDs from orders
  const { data: orderItems } = await query.graph({
    entity: 'order_item',
    fields: ['item_id'],
    filters: { order_id: orderIds } as any
  }) 

  const lineItemIds = (orderItems || [])
    .map((item: { item_id?: string }) => item.item_id)
    .filter((id): id is string => Boolean(id))

  if (!lineItemIds.length) {
    return
  }

  // Get returnable line item extensions for these line items
  const extensionData = await knex('order_line_item_extension')
    .select('id', 'order_line_item_id', 'returnable_flag', 'return_no_of_days')
    .whereIn('order_line_item_id', lineItemIds)
    .andWhere('returnable_flag', true)
    .whereNull('deleted_at')

  if (!extensionData || extensionData.length === 0) {
    return
  }

  // Same logic as fulfillment-delivered-handler: update return_end_date for each returnable item
  for (const item of extensionData) {
    if (item.returnable_flag && item.return_no_of_days > 0) {
      const resultDate = new Date()
      const startOfTodayIst = getStartOfDayIST(resultDate)
      const startOfReturnDayIst = new Date(startOfTodayIst)
      startOfReturnDayIst.setUTCDate(startOfReturnDayIst.getUTCDate() + item.return_no_of_days)

      const endOfDayUtc = new Date(startOfReturnDayIst.getTime() + (24 * 60 * 60 * 1000) - 1)

      const return_end_date = toPostgresFormat(endOfDayUtc)

      await knex('order_line_item_extension')
        .update({ return_end_date })
        .where('id', item.id)
    }
  }
}

export const config: SubscriberConfig = {
  event: 'order_set_delivered',
  context: {
    subscriberId: 'order-set-delivered-return-end-date-handler'
  }
}
