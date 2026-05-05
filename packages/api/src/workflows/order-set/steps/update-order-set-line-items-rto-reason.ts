import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import type { Knex } from 'knex'

import orderSetOrder from '../../../links/order-set-order'

const REASON_CODE = 'RTO'
const REASON = "Couldn't Deliver So Returning To Origin"

export type UpdateOrderSetLineItemsRtoReasonInput = {
  order_set_id: string
}

interface CompensationEntry {
  id: string
  order_line_item_id: string
  previous_reason_code: string | null
  previous_reason: string | null
}

/**
 * Updates the reason and reason_code columns to RTO for all line items
 * in order_line_item_extension that belong to orders in the given order-set.
 */
export const updateOrderSetLineItemsRtoReasonStep = createStep(
  'update-order-set-line-items-rto-reason',
  async (
    input: UpdateOrderSetLineItemsRtoReasonInput,
    { container }
  ): Promise<StepResponse<{ updatedCount: number; lineItemIds: string[] }, CompensationEntry[]>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

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
      return new StepResponse({ updatedCount: 0, lineItemIds: [] }, [])
    }

    const { data: reasonCodeRecords } = await query.graph({
      entity: 'order_reject_cancel_reason_code',
      fields: ['reason_code', 'reason'],
      filters: { reason_code: REASON_CODE },
    })

    if (!reasonCodeRecords?.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Reason code '${REASON_CODE}' does not exist in order_reject_cancel_reason_code table`
      )
    }

    const reasonCodeRecord = reasonCodeRecords[0]
    if (reasonCodeRecord.reason.toLowerCase() !== REASON.toLowerCase()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Reason '${REASON}' does not match the reason '${reasonCodeRecord.reason}' for reason_code '${REASON_CODE}'`
      )
    }

    const { data: orderItems } = await query.graph({
      entity: 'order_item',
      fields: ['item_id'],
      filters: { order_id: orderIds } as any,
    }) 

    const lineItemIds = (orderItems || [])
      .map((item: { item_id?: string }) => item.item_id)
      .filter((id): id is string => Boolean(id))

    if (!lineItemIds.length) {
      return new StepResponse({ updatedCount: 0, lineItemIds: [] }, [])
    }

    const existingRecords = await knex('order_line_item_extension')
      .select('id', 'order_line_item_id', 'reason_code', 'reason')
      .whereIn('order_line_item_id', lineItemIds)
      .whereNull('deleted_at')

    const compensationData: CompensationEntry[] = existingRecords.map((record) => ({
      id: record.id,
      order_line_item_id: record.order_line_item_id,
      previous_reason_code: record.reason_code,
      previous_reason: record.reason,
    }))

    await knex('order_line_item_extension')
      .whereIn('order_line_item_id', lineItemIds)
      .whereNull('deleted_at')
      .update({
        reason_code: REASON_CODE,
        reason: REASON,
        updated_at: knex.fn.now(),
      })

    return new StepResponse(
      { updatedCount: existingRecords.length, lineItemIds },
      compensationData
    )
  },
  async (compensationData: CompensationEntry[], { container }) => {
    if (!compensationData?.length) return

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
    for (const record of compensationData) {
      await knex('order_line_item_extension')
        .where({ id: record.id })
        .update({
          reason_code: record.previous_reason_code,
          reason: record.previous_reason,
          updated_at: knex.fn.now(),
        })
    }
  }
)
