import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { toPostgresFormat } from '../shared/utils'
import { getStartOfDayIST } from '../workflows/delivery-promise/utils/date-time-utils'

export default async function fulfillmentDeliveredHandler({
  event: { data },
  container
}: SubscriberArgs<{ id: string }>) {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const fulfillmentId = data.id

  // Get only the line items that belong to this specific shipment (fulfillment)
  const extensionData = await knex("order_line_item_extension")
    .select("id", "order_line_item_id", "returnable_flag", "return_no_of_days")
    .where("shipment_id", fulfillmentId)
    .andWhere("returnable_flag", true)
    .whereNull("deleted_at")

  if (!extensionData || extensionData.length === 0) {
    return
  }

  for (const item of extensionData) {
    if (item.returnable_flag && item.return_no_of_days > 0) {
      const resultDate = new Date();
      const startOfTodayIst = getStartOfDayIST(resultDate);
      const startOfReturnDayIst = new Date(startOfTodayIst);
      startOfReturnDayIst.setUTCDate(startOfReturnDayIst.getUTCDate() + item.return_no_of_days);

      const endOfDayUtc = new Date(startOfReturnDayIst.getTime() + (24 * 60 * 60 * 1000) - 1);

      const return_end_date = toPostgresFormat(endOfDayUtc);

      await knex("order_line_item_extension")
        .update({ return_end_date: return_end_date })
        .where("id", item.id);
    }
  }
}

export const config: SubscriberConfig = {
  event: 'delivery.created'
}
