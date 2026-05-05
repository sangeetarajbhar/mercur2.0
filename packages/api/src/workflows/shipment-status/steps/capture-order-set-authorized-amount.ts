import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { capturePaymentWorkflow } from '@medusajs/medusa/core-flows'

interface CaptureOrderSetAuthorizedAmountInput {
  orderSetId: string
}

interface CaptureResult {
  paymentCaptured: boolean
  authorizedAmount?: number
  capturedAmount?: number
}

interface CompensationData {
  paymentCollectionId: string
  previousCapturedAmount: number
  previousAuthorizedAmount: number
}

const toNumber = (value: any): number => {
  if (value === null || value === undefined) {
    return 0
  }
  if (typeof value === 'object' && 'value' in value) {
    return Number((value as any).value ?? 0) || 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const captureOrderSetAuthorizedAmountStep = createStep(
  'capture-order-set-authorized-amount',
  async (
    input: CaptureOrderSetAuthorizedAmountInput,
    { container }
  ): Promise<StepResponse<CaptureResult, CompensationData>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

    if (!input.orderSetId) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    // Fetch order set with payment_collection_id, shipment_number, and linked order IDs
    const { data: orderSets } = await query.graph({
      entity: 'order_set',
      fields: ['id', 'payment_collection_id', 'shipment_number', 'orders.id'],
      filters: {
        id: input.orderSetId
      }
    })

    if (!orderSets || orderSets.length === 0) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    const orderSet = orderSets[0]
    const paymentCollectionId = orderSet.payment_collection_id
    if (!paymentCollectionId) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    const { data: paymentCollections } = await query.graph({
      entity: 'payment_collection',
      fields: [
        'id',
        'authorized_amount',
        'captured_amount',
        'payment_sessions.id',
        'payment_sessions.provider_id',
        'payments.id',
        'payments.captured_at'
      ],
      filters: {
        id: paymentCollectionId
      }
    })

    if (!paymentCollections || paymentCollections.length === 0) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    const paymentCollection = paymentCollections[0]
    const paymentSessions = paymentCollection.payment_sessions || []
    const isCod = paymentSessions.some(
      (session: any) => session.provider_id === 'pp_system_default'
    )

    if (!isCod) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    const authorizedAmount = toNumber(paymentCollection.authorized_amount)
    const currentCapturedAmount = toNumber(paymentCollection.captured_amount)

    if (authorizedAmount <= 0) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false, authorizedAmount },
        null as any
      )
    }

    const payments = paymentCollection.payments || []
    if (!payments.length) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false, authorizedAmount },
        null as any
      )
    }

    // --- Calculate the amount to capture ---

    // Step A: Sum item_total for all line items of this order set
    const orderIds: string[] = (orderSet.orders ?? [])
      .map((o: any) => o?.id)
      .filter(Boolean)

    let itemTotalsSum = 0

    if (orderIds.length > 0) {
      // Resolve line item IDs for all orders in the order set
      const { data: orderItems } = await query.graph({
        entity: 'order_item',
        fields: ['item_id'],
        filters: { order_id: orderIds } as any
      }) as any

      const lineItemIds: string[] = (orderItems ?? [])
        .map((oi: any) => oi?.item_id)
        .filter(Boolean)

      if (lineItemIds.length > 0) {
        const extensionRows = await knex('order_line_item_extension')
          .select('item_total')
          .whereIn('order_line_item_id', lineItemIds)

        for (const row of extensionRows ?? []) {
          itemTotalsSum += toNumber(row.item_total)
        }
      }
    }

    // Step B: If shipment_number === 1, add extra charges for the order set
    let extraChargesSum = 0
    const shipmentNumber = toNumber(orderSet.shipment_number)

    if (shipmentNumber === 1) {
      const extraChargeRows = await knex('cart_order_extra_charge')
        .select('fee_amount')
        .where({ order_set_id: input.orderSetId })

      for (const row of extraChargeRows ?? []) {
        extraChargesSum += toNumber(row.fee_amount)
      }
    }

    const capturedAmount = itemTotalsSum + extraChargesSum

    logger.info(
      `[OrderSet Capture] orderSetId=${input.orderSetId} shipment_number=${shipmentNumber} itemTotalsSum=${itemTotalsSum} extraChargesSum=${extraChargesSum} capturedAmount=${capturedAmount}`
    )

    if (capturedAmount <= 0) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false, authorizedAmount },
        null as any
      )
    }

    // Trigger capturePaymentWorkflow for any payment not yet captured
    for (const payment of payments) {
      if (payment?.captured_at) {
        continue
      }
      try {
        await capturePaymentWorkflow.run({
          container,
          input: {
            payment_id: payment?.id
          }
        })
      } catch (error) {
        logger.warn(`[OrderSet Capture] capturePaymentWorkflow failed: ${error}`)
      }
    }

    // Update captured_amount and reduce authorized_amount by the captured amount
    const newAuthorizedAmount = Math.max(authorizedAmount - capturedAmount, 0)

    await knex('payment_collection')
      .where({ id: paymentCollectionId })
      .update({
        captured_amount: capturedAmount,
        authorized_amount: newAuthorizedAmount
      })

    return new StepResponse<CaptureResult, CompensationData>(
      {
        paymentCaptured: true,
        authorizedAmount: newAuthorizedAmount,
        capturedAmount
      },
      {
        paymentCollectionId,
        previousCapturedAmount: currentCapturedAmount,
        previousAuthorizedAmount: authorizedAmount
      }
    )
  },
  async (compensationData: CompensationData | null, { container }) => {
    if (!compensationData || !compensationData.paymentCollectionId) {
      return
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

    logger.warn(
      `[OrderSet Capture Compensation] Rolling back captured_amount and authorized_amount for payment collection ${compensationData.paymentCollectionId}`
    )

    await knex('payment_collection')
      .where({ id: compensationData.paymentCollectionId })
      .update({
        captured_amount: compensationData.previousCapturedAmount,
        authorized_amount: compensationData.previousAuthorizedAmount
      })
  }
)
