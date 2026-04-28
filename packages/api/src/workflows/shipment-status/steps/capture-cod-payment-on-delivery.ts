import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { capturePaymentWorkflow } from '@medusajs/medusa/core-flows'

interface ShipmentLineItem {
  shipment_id: string
  order_line_item_id: string
  currentStatus: string
}

interface CaptureCodPaymentOnDeliveryInput {
  orderId: string
  orderSetId: string | null
  status: string
  shipmentLineItems: ShipmentLineItem[]
}

interface CaptureResult {
  paymentCaptured: boolean
  paymentId?: string
  captured_at?: string | Date
  capturedAmount?: number
}

interface CompensationData {
  paymentCollectionId: string
  previousCapturedAmount: number
  capturedAmount: number
}

export const captureCodPaymentOnDeliveryStep = createStep(
  'capture-cod-payment-on-delivery',
  async (input: CaptureCodPaymentOnDeliveryInput, { container }): Promise<StepResponse<CaptureResult, CompensationData>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

    const lineItemIds = input.shipmentLineItems.map((item) => item.order_line_item_id)

    // Step 1: Get the order_set with payment_collection_id
    if (!input.orderSetId) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    const { data: orderSets } = await query.graph({
      entity: 'order_set',
      fields: ['id', 'payment_collection_id'],
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

    // Step 2: Get payment collection details
    const { data: paymentCollections } = await query.graph({
      entity: 'payment_collection',
      fields: [
        'id',
        'amount',
        'authorized_amount',
        'captured_amount',
        'payment_sessions.id',
        'payment_sessions.provider_id',
        'payments.id',
        'payments.amount',
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

    // Step 3: Check if payment session is COD (pp_system_default)
    const paymentSessions = paymentCollection.payment_sessions || []
    const isCOD = paymentSessions.some(
      (session: any) => session.provider_id === 'pp_system_default'
    )

    if (!isCOD) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    // Step 4: Calculate the total amount for the shipment line items
    const extensionData = await knex('order_line_item_extension')
      .select('id', 'order_line_item_id', 'item_total')
      .whereIn('order_line_item_id', lineItemIds)

    if (!extensionData || extensionData.length === 0) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    // Calculate shipment amount from item_total in order_line_item_extension
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

    let shipmentAmount = 0
    for (const extension of extensionData) {
      const itemTotal = toNumber(extension.item_total)
      shipmentAmount += itemTotal
    }

    // Step 4.1: For first capture, add any extra charges tied to the order_set
    let extraChargeAmount = 0
    if (input.orderSetId) {
      const extraChargeRows = await knex('cart_order_extra_charge')
        .select('fee_amount')
        .where({ order_set_id: input.orderSetId })

      for (const row of extraChargeRows ?? []) {
        extraChargeAmount += toNumber(row.fee_amount)
      }
    }

    if (shipmentAmount <= 0) {
      return new StepResponse<CaptureResult, CompensationData>(
        { paymentCaptured: false },
        null as any
      )
    }

    // Step 5: Check if this is the first capture
    const payments = paymentCollection.payments || []
    const isFirstCapture = payments.length > 0 && !payments[0]?.captured_at
    const currentCapturedAmount = toNumber(paymentCollection.captured_amount)

    // Step 6: If first capture, trigger capturePaymentWorkflow to set captured_at on the payment record
    if (isFirstCapture) {
      const payment = payments[0]
      try {
        await capturePaymentWorkflow.run({
          container,
          input: {
            payment_id: payment?.id
          }
        })
      } catch (error) {
        logger.warn(`[COD Capture] capturePaymentWorkflow failed: ${error}`)
      }
    }

    // Step 7: Calculate and update captured_amount
    const captureThisRun = isFirstCapture
      ? shipmentAmount + extraChargeAmount
      : shipmentAmount

    const newCapturedAmount = isFirstCapture
      ? captureThisRun
      : currentCapturedAmount + captureThisRun

    await knex('payment_collection')
      .where({ id: paymentCollectionId })
      .update({
        captured_amount: newCapturedAmount
      })

    return new StepResponse<CaptureResult, CompensationData>(
      {
        paymentCaptured: true,
        capturedAmount: captureThisRun
      },
      {
        // Compensation data: store info needed to rollback
        paymentCollectionId,
        // For first capture, previous was 0 (or whatever was there before)
        // For subsequent captures, previous is the actual currentCapturedAmount
        previousCapturedAmount: isFirstCapture ? 0 : currentCapturedAmount,
        capturedAmount: shipmentAmount
      }
    )
  },
  async (compensationData: CompensationData | null, { container }) => {
    // Compensation logic: Revert the captured_amount to previous value
    if (!compensationData || !compensationData.paymentCollectionId) {
      return
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

    logger.warn(
      `[COD Capture Compensation] Rolling back captured_amount for payment collection ${compensationData.paymentCollectionId}: ${compensationData.previousCapturedAmount + compensationData.capturedAmount} -> ${compensationData.previousCapturedAmount}`
    )

    await knex('payment_collection')
      .where({ id: compensationData.paymentCollectionId })
      .update({
        captured_amount: compensationData.previousCapturedAmount
      })
  }
)

