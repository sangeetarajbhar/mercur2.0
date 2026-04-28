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

    const paymentCollectionId = orderSets[0].payment_collection_id
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

    await knex('payment_collection')
      .where({ id: paymentCollectionId })
      .update({
        captured_amount: authorizedAmount
      })

    return new StepResponse<CaptureResult, CompensationData>(
      {
        paymentCaptured: true,
        authorizedAmount,
        capturedAmount: authorizedAmount
      },
      {
        paymentCollectionId,
        previousCapturedAmount: currentCapturedAmount
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
      `[OrderSet Capture Compensation] Rolling back captured_amount for payment collection ${compensationData.paymentCollectionId}: ${compensationData.previousCapturedAmount}`
    )

    await knex('payment_collection')
      .where({ id: compensationData.paymentCollectionId })
      .update({
        captured_amount: compensationData.previousCapturedAmount
      })
  }
)
