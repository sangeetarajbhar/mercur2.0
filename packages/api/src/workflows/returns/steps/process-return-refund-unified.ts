import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import refundOrderLineItem from '../../../links/refund-order-line-item'
import { processCodRefundViaRazorpayPayoutWorkflow } from '../../cod-refund-razorpay-payout/workflows'
import { createRefundOrderLineItemLinksWorkflow } from '../../payment/workflows'
import { refundSplitOrderPaymentWorkflow } from '../../split-order-payment/workflows'
import { updateReturnRefundStatusWorkflow } from '../update-return-refund-status'
import type { ReturnItemWithAmount } from './fetch-return-and-order-for-receive-refund'

export interface ProcessReturnRefundUnifiedInput {
  return_id: string
  orderId: string
  totalRefundAmount: number
  return_item_ids: ReturnItemWithAmount[]
  paymentId: string | null
  splitOrderPaymentId: string | null
  isCod: boolean
  updated_by: string
}

export interface ProcessReturnRefundUnifiedOutput {
  refund_processed: boolean
  payment_id: string | null
  total_refund_amount: number
}

export const processReturnRefundUnifiedStep = createStep(
  'process-return-refund-unified',
  async (
    input: ProcessReturnRefundUnifiedInput,
    { container }
  ): Promise<StepResponse<ProcessReturnRefundUnifiedOutput>> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const {
      return_id,
      orderId,
      totalRefundAmount,
      return_item_ids,
      paymentId,
      splitOrderPaymentId,
      isCod,
      updated_by
    } = input

    logger.info(`[process-return-refund-unified] started, 
      ${JSON.stringify({
        return_id: return_id,
        order_id: orderId,
        is_cod: isCod,
        total_refund_amount: totalRefundAmount,
        item_count: return_item_ids?.length || 0
      })}
    `)

    if (
      !splitOrderPaymentId ||
      !paymentId ||
      totalRefundAmount <= 0 ||
      !return_item_ids?.length
    ) {
      const skipReasons: string[] = []
      if (!splitOrderPaymentId) skipReasons.push('missing_split_order_payment_id')
      if (!paymentId) skipReasons.push('missing_payment_id')
      if (totalRefundAmount <= 0) skipReasons.push('invalid_total_refund_amount')
      if (!return_item_ids?.length) skipReasons.push('no_return_items_to_refund')

      logger.error(`[process-return-refund-unified] skipped refund, 
        ${JSON.stringify({
          return_id: return_id,
          order_id: orderId,
          is_cod: isCod,
          total_refund_amount: totalRefundAmount,
          item_count: return_item_ids?.length || 0,
          skip_reasons: skipReasons
        })}
      `)
      return new StepResponse({
        refund_processed: false,
        payment_id: paymentId ?? null,
        total_refund_amount: 0
      })
    }

    if (isCod) {
      logger.info(`[process-return-refund-unified] COD payout flow started, 
        ${JSON.stringify({
          return_id: return_id,
          order_id: orderId,
          is_cod: isCod,
          total_refund_amount: totalRefundAmount,
          created_by: updated_by
        })}
      `)
      try {
        await processCodRefundViaRazorpayPayoutWorkflow(container).run({
          input: {
            return_id,
            orderId,
            amount: totalRefundAmount,
            order_line_item_id: return_item_ids[0].order_line_item_id,
            actor_id: updated_by,
            created_by: updated_by,
            refund_source: 'Refund Processed by System'
          }
        })

        logger.info(`[process-return-refund-unified] COD payout flow completed, 
          ${JSON.stringify({
            return_id: return_id,
            order_id: orderId,
            is_cod: isCod,
            total_refund_amount: totalRefundAmount,
            created_by: updated_by
          })}
        `)
      } catch (error) {
        logger.error(`[process-return-refund-unified] COD payout flow failed, 
          ${JSON.stringify({
            return_id: return_id,
            order_id: orderId,
            is_cod: isCod,
            total_refund_amount: totalRefundAmount,
            created_by: updated_by,
            error: (error as Error)?.message
          })}
        `)
        const message =
          error instanceof Error && error.message
            ? `Receive & Return Payout failed. ${error.message}`
            : 'Receive & Return Payout failed. Please try again.'

        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
      }
    }


    const refundSplitRunResult = await refundSplitOrderPaymentWorkflow(
      container
    ).run({
      input: {
        id: splitOrderPaymentId,
        amount: totalRefundAmount
      }
    })


    for (const { order_line_item_id, amount } of return_item_ids) {
      const linkRunResult = await createRefundOrderLineItemLinksWorkflow(
        container
      ).run({
        input: {
          payment_id: paymentId,
          order_line_item_id,
          amount
        }
      })

    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    for (const { order_line_item_id } of return_item_ids) {
      const { data: refundLinks } = await query.graph({
        entity: refundOrderLineItem.entryPoint,
        fields: ['refund_id', 'order_line_item_id'],
        filters: { order_line_item_id }
      })
      if (!refundLinks?.length) {
        logger.error(`[process-return-refund-unified] failed to create refund-order-line-item link for order_line_item_id, 
          ${JSON.stringify({
            return_id: return_id,
            order_id: orderId,
            is_cod: isCod,
            total_refund_amount: totalRefundAmount,
            created_by: updated_by,
            order_line_item_id: order_line_item_id
          })}
        `)
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Failed to create refund-order-line-item link for order_line_item_id: ${order_line_item_id}`
        )
      }
    }

   
    await updateReturnRefundStatusWorkflow(container).run({
      input: { returnId: return_id, updated_by }
    })

    logger.info(`[process-return-refund-unified] completed, 
      ${JSON.stringify({
        return_id: return_id,
        order_id: orderId,
        is_cod: isCod,
        created_by: updated_by,
        payment_id: paymentId,
        total_refund_amount: totalRefundAmount
      })}
    `)
    return new StepResponse({
      refund_processed: true,
      payment_id: paymentId,
      total_refund_amount: totalRefundAmount
    })
  }
)
