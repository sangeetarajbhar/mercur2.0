import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

interface UpdateLineItemsReturnableFlagInput {
  orderSetId: string | null | undefined
  shipmentId: string
  status: string
  shipments: Array<{
    shipment_id: string
    order_line_item_id: string
  }>
}

interface CompensationEntry {
  id: string
  order_line_item_id: string
  previous_flag: boolean
}

export const updateLineItemsReturnableFlagStep = createStep(
  'update-line-items-returnable-flag',
  async (
    input: UpdateLineItemsReturnableFlagInput,
    { container }
  ): Promise<StepResponse<CompensationEntry[], CompensationEntry[]>> => {
    const { orderSetId, shipmentId, shipments, status } = input

    if (
      !orderSetId ||
      !shipmentId ||
      !shipments?.length ||
      status !== OrderLineItemStatus.DELIVERED
    ) {
      return new StepResponse([], [])
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const deliveryDetail = await knex('order_delivery_detail')
      .select('delivery_type')
      .where({ order_set_id: orderSetId })
      .first()

    if (!deliveryDetail || deliveryDetail.delivery_type !== 'home_trial') {
      return new StepResponse([], [])
    }

    // Get only the line items that belong to this specific shipment
    const existingRecords = await knex('order_line_item_extension')
      .select('id', 'order_line_item_id', 'returnable_flag')
      .where('shipment_id', shipmentId)
      .andWhere('returnable_flag', true)
      .whereNull('deleted_at')

    if (!existingRecords.length) {
      return new StepResponse([], [])
    }

    await knex('order_line_item_extension')
      .whereIn(
        'id',
        existingRecords.map((record) => record.id)
      )
      .update({
        returnable_flag: false,
        delivered_at: knex.fn.now()
      })

    const compensationData: CompensationEntry[] = existingRecords.map(
      (record) => ({
        id: record.id,
        order_line_item_id: record.order_line_item_id,
        previous_flag: record.returnable_flag
      })
    )

    return new StepResponse(compensationData, compensationData)
  },
  async (compensationData, { container }) => {
    if (!compensationData?.length) {
      return
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    for (const record of compensationData) {
      await knex('order_line_item_extension')
        .where({ id: record.id })
        .update({ returnable_flag: record.previous_flag })
    }
  }
)


