import {
  WorkflowResponse,
  createWorkflow,
  when,
  transform,
} from '@medusajs/framework/workflows-sdk'
import { updatePaymentCollectionStep } from '@medusajs/medusa/core-flows'
import { sendToSQSStep } from '../../cart/steps/send-to-sqs'
import { createOrderFulfillmentWorkflow } from '../../fulfillment/workflows/create-fullfilment'

import {
  validateStatusUpdateStep,
  updateLineItemExtensionStatusStep,
  updatePackedLineItemsWithShipmentStep,
  updateOrderStatusStep,
  createRefundLinksForLineItemsStep,
  updatePaymentAmountsStep,
  refundPrepaidLineItemsStep
} from '../steps'
import { frappeOrderCreateStep } from '../../frappe/steps/frappe-order-create'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'
import { PaymentCollectionStatus } from '@medusajs/framework/utils'
import { updateOrderSetStatusStep } from '../../order-set/steps/update-order-set-status'

interface UpdateOrderStatusInput {
  marketplaceOrderId: string
  status: string
  locationCode: string
  lineItems: Array<{
    lineItemId: string
    reason?: string
    reasonCode?: string
  }>
}

export const updateOrderStatusWorkflow = createWorkflow(
  'update-order-status',
  function (input: UpdateOrderStatusInput) {
    // Step 1: Validate the status update request
    const validationResult = validateStatusUpdateStep({
      marketplaceOrderId: input.marketplaceOrderId,
      locationCode: input.locationCode,
      lineItems: input.lineItems,
      status: input.status
    })

    const validatedLineItemsRef = transform(validationResult, (data) => data.validatedLineItems)
    const orderIdRef = transform(validationResult, (data) => data.orderId)
    const stockLocationIdRef = transform(validationResult, (data) => data.stockLocationId)
    const skipStatusUpdateRef = transform(validationResult, (data) => data.skipStatusUpdate ?? false)
    const existingShipmentIdRef = transform(validationResult, (data) => data.existingShipmentId)
    const paymentCollectionIdsRef = transform(validationResult, (data) => data.paymentCollectionIds ?? [])
    const paymentProviderIdsRef = transform(validationResult, (data) => data.paymentProviderIds ?? [])
    const paymentCollectionsRef = transform(validationResult, (data) => data.paymentCollections ?? [])
    const lineItemAdjustmentsRef = transform(validationResult, (data) => data.lineItemAmountAdjustments ?? [])
    const paymentsRef = transform(validationResult, (data) => data.payments ?? [])
    const allLineItemsInactiveRef = transform(
      validationResult,
      (data) => data.allLineItemsInactiveAfterUpdate ?? false
    )

    const frappeResult = when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) =>
        !skipStatusUpdate && status === OrderLineItemStatus.PACKED
    ).then(() => {
      return frappeOrderCreateStep({
        marketplaceOrderId: input.marketplaceOrderId,
        locationCode: input.locationCode,
        lineItems: input.lineItems
      })
    })

    const packedShipmentResult = when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef, frappeResult },
      ({ status, skipStatusUpdate }) =>
        !skipStatusUpdate && status === OrderLineItemStatus.PACKED
    ).then(() => {
      const itemsDataRef = transform(validatedLineItemsRef, (items) =>
        items.map((item) => ({
          id: item.lineItemId,
          quantity: 1
        }))
      )

      return createOrderFulfillmentWorkflow.runAsStep({
        input: {
          order_id: orderIdRef,
          items: itemsDataRef,
          location_id: stockLocationIdRef
        }
      })
    })

    const packedLineItemAndShipmentUpdate = when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef, packedShipmentResult },
      ({ status, skipStatusUpdate, packedShipmentResult }) =>
        !skipStatusUpdate &&
        status === OrderLineItemStatus.PACKED &&
        !!packedShipmentResult
    ).then(() => {
      return updatePackedLineItemsWithShipmentStep(
        transform(
          { packedShipmentResult, validatedLineItemsRef },
          ({ packedShipmentResult, validatedLineItemsRef }) => ({
          shipmentId: packedShipmentResult!.id,
            validatedLineItems: validatedLineItemsRef.map((item) => ({
              orderLineItemExtensionId: item.orderLineItemExtensionId,
              currentStatus: item.currentStatus as OrderLineItemStatus
            }))
          })
        )
      )
    })

    when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) =>
        !skipStatusUpdate && status !== OrderLineItemStatus.PACKED
    ).then(() => {
      const lineItemStatusResult = updateLineItemExtensionStatusStep({
        validatedLineItems: validatedLineItemsRef,
        status: input.status
      })

      updateOrderStatusStep(
        transform({ orderIdRef, lineItemStatusResult }, ({ orderIdRef }) => ({
          orderIds: orderIdRef ? [orderIdRef] : []
        }))
      ).config({
        name: 'update-order-status-non-packed'
      })

      updateOrderSetStatusStep(
        transform({ orderIdRef, lineItemStatusResult }, ({ orderIdRef }) => ({
          orderIds: orderIdRef ? [orderIdRef] : []
        }))
      ).config({
        name: 'update-order-set-status-non-packed'
      })
    })

    when(
      {
        status: input.status,
        skipStatusUpdate: skipStatusUpdateRef,
        packedLineItemAndShipmentUpdate
      },
      ({ status, skipStatusUpdate, packedLineItemAndShipmentUpdate }) =>
        !skipStatusUpdate &&
        status === OrderLineItemStatus.PACKED &&
        !!packedLineItemAndShipmentUpdate
    ).then(() => {
      updateOrderStatusStep(
        transform(
          { orderIdRef, packedLineItemAndShipmentUpdate },
          ({ orderIdRef }) => ({
            orderIds: orderIdRef ? [orderIdRef] : []
          })
        )
      ).config({
        name: 'update-order-status-packed'
      })

      updateOrderSetStatusStep(
        transform(
          { orderIdRef, packedLineItemAndShipmentUpdate },
          ({ orderIdRef }) => ({
            orderIds: orderIdRef ? [orderIdRef] : []
          })
        )
      ).config({
        name: 'update-order-set-status-packed'
      })
    })

    const cancellationMessageRef = transform(validationResult, (data) => ({
      operation: 'updateOrder',
      orderEvent: 'cancellation',
      marketplaceOrderId: input.marketplaceOrderId,
      eventTimestamp: new Date().toISOString(),
      lineItems: data.validatedLineItems.map((item: any) => ({
        lineItemId: item.lineItemId,
        reason: item.reason,
        reasonCode: item.reasonCode
      }))
    }))


    when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) =>
        !skipStatusUpdate &&
        [OrderLineItemStatus.REJECTED, OrderLineItemStatus.CANCELLED].includes(
          status as OrderLineItemStatus
        )
    ).then(() => {
      sendToSQSStep({
        messages: [
          {
            body: cancellationMessageRef
          }
        ],
        queueUrl: process.env.AWS_SQS_ORDER_QUEUE_URL
      })
    })

    const refundLinkInputRef = transform(validationResult, (data) => ({
      paymentIds: data.paymentIds ?? [],
      lineItemIds: data.validatedLineItems.map((item) => item.lineItemId)
    }))

    when(
      { status: input.status, paymentProviderIds: paymentProviderIdsRef, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, paymentProviderIds, skipStatusUpdate }) => {
        if (skipStatusUpdate) {
          return false
        }

        if (
          ![OrderLineItemStatus.REJECTED, OrderLineItemStatus.CANCELLED].includes(
            status as OrderLineItemStatus
          )
        ) {
          return false
        }

        return (
          Array.isArray(paymentProviderIds) &&
          paymentProviderIds.some((providerId) => providerId === 'pp_system_default')
        )
      }
    ).then(() => {
      createRefundLinksForLineItemsStep(refundLinkInputRef)
    })

    const splitOrderPaymentIdRef = transform(validationResult, (data) => data.splitOrderPayment?.id)
    const firstPaymentIdRef = transform(paymentsRef, (payments) => payments?.[0]?.id)

    const prepaidRefundInputRef = transform(
      { lineItemAdjustmentsRef, splitOrderPaymentIdRef, firstPaymentIdRef },
      ({ lineItemAdjustmentsRef, splitOrderPaymentIdRef, firstPaymentIdRef }) => ({
        splitOrderPaymentId: splitOrderPaymentIdRef,
        lineItemAmounts: lineItemAdjustmentsRef.map((item: any) => ({
          lineItemId: item.lineItemId,
          amount: item.amount
        })),
        paymentId: firstPaymentIdRef
      })
    )

    when(
      { status: input.status, paymentProviderIds: paymentProviderIdsRef, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, paymentProviderIds, skipStatusUpdate }) => {
        if (skipStatusUpdate) {
          return false
        }

        if (
          ![OrderLineItemStatus.REJECTED, OrderLineItemStatus.CANCELLED].includes(
            status as OrderLineItemStatus
          )
        ) {
          return false
        }

        return (
          Array.isArray(paymentProviderIds) &&
          paymentProviderIds.every((providerId) => providerId !== 'pp_system_default')
        )
      }
    ).then(() => {
      refundPrepaidLineItemsStep(prepaidRefundInputRef)
    })

    const amountDeltaRef = transform(lineItemAdjustmentsRef, (items) => {
      if (!items?.length) {
        return {
          amount: 0,
          rawAmount: 0
        }
      }

      return items.reduce(
        (acc, item) => ({
          amount: acc.amount + (item.amount ?? 0),
          rawAmount: acc.rawAmount + (item.rawAmount ?? item.amount ?? 0)
        }),
        { amount: 0, rawAmount: 0 }
      )
    })

    const coerceNumeric = (value: any) => {
      if (value === null || value === undefined) {
        return 0
      }
      if (typeof value === 'object' && 'value' in value) {
        return Number((value as any).value ?? 0) || 0
      }
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const formatRawAmount = (value: number, template?: any) => {
      const precision =
        (template && typeof template === 'object' && template.precision) || 20

      return {
        value: Math.round(value).toString(),
        precision
      }
    }

    const cancelPaymentCollectionInput = transform(paymentCollectionIdsRef, (ids) => ({
      selector: { id: ids },
      update: { status: PaymentCollectionStatus.CANCELED }
    }))

    const amountAdjustmentInput = transform(
      { paymentCollectionsRef, amountDeltaRef },
      ({ paymentCollectionsRef, amountDeltaRef }) => {
        if (!paymentCollectionsRef.length || !amountDeltaRef || !amountDeltaRef.amount) {
          return null
        }

        const selectorIds = paymentCollectionsRef.map((pc: any) => pc.id)
        if (!selectorIds.length) {
          return null
        }

        const baseCollection = paymentCollectionsRef[0] || {}
        const baseAmount = coerceNumeric(baseCollection.amount)
        const baseRawAmount = coerceNumeric(
          baseCollection.raw_amount ?? baseCollection.amount
        )
        const baseAuthorizedAmount = coerceNumeric(
          baseCollection.authorized_amount ?? baseCollection.amount
        )

        const deltaAmount = coerceNumeric(amountDeltaRef.amount)
        const deltaRawAmount = coerceNumeric(amountDeltaRef.rawAmount)

        const nextAmount = Math.max(baseAmount - deltaAmount, 0)
        const nextRawAmount = Math.max(baseRawAmount - deltaRawAmount, 0)
        const nextAuthorizedAmount = Math.max(
          baseAuthorizedAmount - deltaAmount,
          0
        )

        return {
          selector: { id: selectorIds },
          update: {
            amount: nextAmount,
            raw_amount: formatRawAmount(nextRawAmount, baseCollection.raw_amount),
            authorized_amount: nextAuthorizedAmount
          }
        }
      }
    )

    const paymentAmountAdjustmentInput = transform(
      { paymentsRef, amountDeltaRef },
      ({ paymentsRef, amountDeltaRef }) => {
        if (!paymentsRef.length || !amountDeltaRef || !amountDeltaRef.amount) {
          return null
        }

        let remaining = coerceNumeric(amountDeltaRef.amount)
        const updates: Array<{ id: string; amount: number }> = []

        for (const payment of paymentsRef) {
          if (!payment?.id || !remaining) {
            continue
          }

          const currentAmount = coerceNumeric(payment.amount)
          if (!currentAmount) {
            continue
          }

          const deduction = Math.min(currentAmount, remaining)
          if (!deduction) {
            continue
          }

          const nextAmount = Math.max(currentAmount - deduction, 0)
          remaining = Math.max(remaining - deduction, 0)

          if (nextAmount !== currentAmount) {
            updates.push({
              id: payment.id,
              amount: nextAmount
            })
          }

          if (!remaining) {
            break
          }
        }

        if (!updates.length) {
          return null
        }

        return updates
      }
    )

    when(
      {
        status: input.status,
        paymentProviderIds: paymentProviderIdsRef,
        amountAdjustmentInput,
        skipStatusUpdate: skipStatusUpdateRef
      },
      ({ status, paymentProviderIds, amountAdjustmentInput, skipStatusUpdate }) => {
        if (skipStatusUpdate) {
          return false
        }

        if (
          ![OrderLineItemStatus.REJECTED, OrderLineItemStatus.CANCELLED].includes(
            status as OrderLineItemStatus
          )
        ) {
          return false
        }

        const hasSystemDefaultPayment =
          Array.isArray(paymentProviderIds) &&
          paymentProviderIds.some((providerId) => providerId === 'pp_system_default')

        return hasSystemDefaultPayment && !!amountAdjustmentInput
      }
    ).then(() => {
      updatePaymentCollectionStep(amountAdjustmentInput).config({
        name: 'adjust-payment-collection-amount'
      })
    })

    when(
      {
        status: input.status,
        paymentProviderIds: paymentProviderIdsRef,
        paymentAmountAdjustmentInput,
        skipStatusUpdate: skipStatusUpdateRef
      },
      ({ status, paymentProviderIds, paymentAmountAdjustmentInput, skipStatusUpdate }) => {
        if (skipStatusUpdate) {
          return false
        }

        if (
          ![OrderLineItemStatus.REJECTED, OrderLineItemStatus.CANCELLED].includes(
            status as OrderLineItemStatus
          )
        ) {
          return false
        }

        const hasSystemDefaultPayment =
          Array.isArray(paymentProviderIds) &&
          paymentProviderIds.some((providerId) => providerId === 'pp_system_default')

        return hasSystemDefaultPayment && !!paymentAmountAdjustmentInput
      }
    ).then(() => {
      updatePaymentAmountsStep(paymentAmountAdjustmentInput).config({
        name: 'adjust-payment-amounts'
      })
    })

    when(
      {
        status: input.status,
        paymentCollectionIds: paymentCollectionIdsRef,
        paymentProviderIds: paymentProviderIdsRef,
        shouldCancelPaymentCollection: allLineItemsInactiveRef,
        skipStatusUpdate: skipStatusUpdateRef
      },
      ({ status, paymentCollectionIds, paymentProviderIds, shouldCancelPaymentCollection, skipStatusUpdate }) => {
        if (skipStatusUpdate) {
          return false
        }

        if (
          ![OrderLineItemStatus.REJECTED, OrderLineItemStatus.CANCELLED].includes(
            status as OrderLineItemStatus
          )
        ) {
          return false
        }

        const hasSystemDefaultPayment =
          Array.isArray(paymentProviderIds) &&
          paymentProviderIds.some((providerId) => providerId === 'pp_system_default')

        if (!shouldCancelPaymentCollection) {
          return false
        }

        return hasSystemDefaultPayment && Array.isArray(paymentCollectionIds) && paymentCollectionIds.length > 0
      }
    ).then(() => {
      updatePaymentCollectionStep(cancelPaymentCollectionInput).config({
        name: 'cancel-payment-collection'
      })
    })

    const shipmentResultRef = transform(
      { packedLineItemAndShipmentUpdate },
      ({ packedLineItemAndShipmentUpdate }) => packedLineItemAndShipmentUpdate
    )

    return new WorkflowResponse({
      status: input.status,
      shipmentResult: shipmentResultRef,
      existingShipmentId: existingShipmentIdRef
    })
  }
)

