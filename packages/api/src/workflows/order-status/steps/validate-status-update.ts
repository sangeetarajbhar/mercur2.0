import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import {
  VALID_STATUS_TRANSITIONS,
  STATUSES_REQUIRING_REASON,
  OrderLineItemStatus
} from '../../../utils/constants/order-statuses'
import { COD_PAYMENT_PROVIDER } from '../../../utils/constants/payments'
import sellerOrder from '@mercurjs/core-plugin/links/order-seller-link'
import { RedisKey } from '../../../shared/utils/redisKey'
import CustomCacheModuleService from '../../../modules/cache/service'

interface ValidateStatusUpdateInput {
  marketplaceOrderId: string
  locationCode: string
  lineItems: Array<{
    lineItemId: string
    reason?: string
    reasonCode?: string
  }>
  status: string
}

interface ValidationResult {
  orderId: string
  stockLocationId: string
  validatedLineItems: Array<{
    lineItemId: string
    orderLineItemExtensionId: string
    currentStatus: string
    reason?: string
    reasonCode?: string
  }>
  locationCode: string
  status: string
  paymentIds: string[]
  paymentCollectionIds: string[]
  paymentProviderIds: string[]
  allLineItemsInactiveAfterUpdate: boolean
  paymentCollections: Array<{
    id: string
    amount?: number
    raw_amount?: number
    authorized_amount?: number
  }>
  lineItemAmountAdjustments: Array<{
    lineItemId: string
    amount: number
    rawAmount: number
  }>
  payments: Array<{
    id: string
    amount?: number
  }>
  splitOrderPayment?: {
    id: string
    captured_amount?: number
  }
  skipStatusUpdate?: boolean
  existingShipmentId?: string
}

export const validateStatusUpdateStep = createStep(
  'validate-status-update',
  async (input: ValidateStatusUpdateInput, { container }): Promise<StepResponse<ValidationResult>> => {
    const logPrefix = '[validate-status-update]'
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // 1. Get order ID from marketplace order ID
    const { data: orderExtraDetails } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['order_id', 'stock_location_id'],
      filters: {
        marketplace_order_id: input.marketplaceOrderId
      }
    })

    if (!orderExtraDetails || orderExtraDetails.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order with marketplace ID ${input.marketplaceOrderId} not found`
      )
    }

    const orderId = orderExtraDetails[0].order_id
    const orderStockLocationId = orderExtraDetails[0].stock_location_id
    logger.log(`${logPrefix} Order details: ${JSON.stringify({ marketplaceOrderId: input.marketplaceOrderId, orderId, orderStockLocationId })}`)

    // 2. Fetch seller_id for the order
    const { data: sellerOrderLinks } = await query.graph({
      entity: sellerOrder.entryPoint,
      fields: ['seller_id', 'order_id'],
      filters: {
        order_id: orderId
      }
    })

    if (!sellerOrderLinks || sellerOrderLinks.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No seller found for order ${orderId}`
      )
    }

    const sellerId = sellerOrderLinks[0].seller_id
    logger.log(`${logPrefix} Seller resolved: ${JSON.stringify({ orderId, sellerId })}`)

    // 3. Validate locationCode (partner_wh_code) via cache: fetch from cache using seller_id + partner_wh_code
    const cacheKey = `${RedisKey.STOCK_LOCATION_CACHE}:${sellerId}:${input.locationCode}`
    const cacheService = container.resolve<CustomCacheModuleService>(Modules.CACHE)
    const cachedLocation = await cacheService.get<{ stock_location_id: string; partner_wh_code: string }>(cacheKey)
    logger.log(`${logPrefix} Cache lookup: ${JSON.stringify({ cacheKey, cachedLocation: !!cachedLocation, stockLocationIdFromCache: cachedLocation?.stock_location_id })}`)

    if (!cachedLocation || !cachedLocation.stock_location_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Location with code ${input.locationCode} not found for seller`
      )
    }

    const stockLocationId = cachedLocation.stock_location_id

    // 4. Ensure the cached stock location matches the order's stock location
    logger.log(`${logPrefix} Location validation: ${JSON.stringify({ orderStockLocationId, cachedStockLocationId: stockLocationId, match: orderStockLocationId === stockLocationId })}`)
    if (orderStockLocationId && orderStockLocationId !== stockLocationId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Location code ${input.locationCode} does not match the marketplace order's stock location`
      )
    }

    // 5. Validate line items belong to the order
    const lineItemIds = input.lineItems.map((item) => item.lineItemId)

    // Query the order with its items to validate line items belong to this order
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'items.id',
        'items.total',
        'items.raw_total',
        'items.subtotal',
        'items.original_total',
        'items.unit_price',
        'items.quantity',
        'items.detail.item_total',
        'items.detail.item_discount_total',
        'payment_collections.id',
        'payment_collections.amount',
        'payment_collections.raw_amount',
        'payment_collections.authorized_amount',
        'payment_collections.payments.id',
        'payment_collections.payments.amount',
        'payment_collections.payments.authorized_amount',
        'payment_collections.payments.provider_id',
        'payment_collections.payments.captured_at',
        'split_order_payment.id',
        'split_order_payment.captured_amount'
      ],
      filters: {
        id: orderId
      }
    })

    if (!orders || orders.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        'Order not found'
      )
    }

    const order = orders[0]
    const orderItems = order.items ?? []
    const orderItemIds = orderItems.map((item: any) => item.id)
    const paymentCollections =
      order.payment_collections?.map((collection: any) => ({
        id: collection.id,
        amount: collection.amount,
        raw_amount: collection.raw_amount,
        authorized_amount: collection.authorized_amount
      })) ?? []

    // Validate prepaid payment capture status for ACCEPTED and PACKED status updates
    const isStatusUpdateRequiringPaymentValidation =
      input.status === OrderLineItemStatus.ACCEPTED || input.status === OrderLineItemStatus.PACKED

    if (isStatusUpdateRequiringPaymentValidation) {
      // Check if order has payment collections
      if (!order.payment_collections || order.payment_collections.length === 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Payment collection not found for prepaid Order Id: ${orderId} and marketplace order ID: ${input.marketplaceOrderId}`
        )
      }

      // Get all payments from all collections
      const allPayments = order.payment_collections.flatMap((collection: any) =>
        collection?.payments ?? []
      )

      // Check if payments exist
      if (allPayments.length === 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Payment(s) not found for prepaid Order Id: ${orderId} and marketplace order ID: ${input.marketplaceOrderId}`
        )
      }

      // Filter prepaid payments (non-COD payments)
      const prepaidPayments = allPayments.filter(
        (payment: any) => payment?.provider_id && payment.provider_id !== COD_PAYMENT_PROVIDER
      )

      // If there are prepaid payments, validate they are captured
      if (prepaidPayments.length > 0) {
        // Check if all prepaid payments have captured_at (not null)
        const uncapturedPayments = prepaidPayments.filter(
          (payment: any) => !payment?.captured_at
        )

        if (uncapturedPayments.length > 0) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Payment(s) have not been captured for Order Id: ${orderId} and marketplace order ID: ${input.marketplaceOrderId}`
          )
        }
      }
    }

    const paymentCollectionIds = paymentCollections.map((collection) => collection.id)

    const paymentProviderIds =
      order.payment_collections?.flatMap((collection: any) =>
        collection?.payments
          ?.map((payment: any) => payment.provider_id)
          ?.filter(Boolean)
      ) ?? []

    const paymentIds =
      order.payment_collections?.flatMap((collection: any) =>
        collection?.payments?.map((payment: any) => payment.id)
      ) ?? []

    const payments =
      order.payment_collections?.flatMap((collection: any) =>
        (collection?.payments?.map((payment: any) => ({
          id: payment.id,
          amount: payment.amount
        })) ?? [])
      ) ?? []

    const splitOrderPayment = order.split_order_payment
      ? {
          id: order.split_order_payment.id,
          captured_amount: order.split_order_payment.captured_amount
        }
      : undefined

    // Check if all requested line items belong to this order
    const invalidLineItems = lineItemIds.filter(
      (lineItemId) => !orderItemIds.includes(lineItemId)
    )

    if (invalidLineItems.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Line items ${invalidLineItems.join(', ')} do not belong to this order`
      )
    }

    // Also check if all line items exist
    if (orderItemIds.length === 0 && lineItemIds.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Order has no line items'
      )
    }

    // 4. Get order line item extensions and validate current status
    const { data: orderLineItemExtensions } = await query.graph({
      entity: 'order_line_item_extension',
      fields: ['id', 'order_line_item_id', 'status', 'item_total', 'item_discount_total', 'shipment_id'],
      filters: {
        order_line_item_id: orderItemIds
      }
    })

    if (!orderLineItemExtensions || orderLineItemExtensions.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Order line item extensions not found for this order'
      )
    }

    const extensionsByLineItemId = new Map(
      orderLineItemExtensions.map((ext: any) => [ext.order_line_item_id, ext])
    )

    const missingLineItems = lineItemIds.filter(
      (lineItemId) => !extensionsByLineItemId.has(lineItemId)
    )

    if (missingLineItems.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order line item extension not found for line items ${missingLineItems.join(', ')}`
      )
    }

    // Check if all line items are already at the target status (idempotent request)
    // Also treat PACKED → ACCEPTED as a no-op since PACKED already implies ACCEPTED
    const allItemsAlreadyAtTargetStatus = input.lineItems.every((item) => {
      const extension = extensionsByLineItemId.get(item.lineItemId)
      if (!extension) return false
      return extension.status === input.status ||
        (extension.status === OrderLineItemStatus.PACKED && input.status === OrderLineItemStatus.ACCEPTED)
    })

    // For PACKED idempotency, require shipment_id on every targeted line item.
    // If any packed line item is missing shipment_id, do not skip; allow workflow to heal linkage.
    const allPackedItemsHaveShipmentId =
      input.status === OrderLineItemStatus.PACKED
        ? input.lineItems.every((item) => {
            const extension = extensionsByLineItemId.get(item.lineItemId)
            return !!extension?.shipment_id
          })
        : true

    if (
      input.status === OrderLineItemStatus.PACKED &&
      allItemsAlreadyAtTargetStatus &&
      !allPackedItemsHaveShipmentId
    ) {
      logger.warn(`${logPrefix} PACKED idempotency bypassed due to missing shipment_id: ${JSON.stringify({
        marketplaceOrderId: input.marketplaceOrderId,
        lineItemIds: input.lineItems.map((item) => item.lineItemId)
      })}`)
    }

    if (allItemsAlreadyAtTargetStatus && allPackedItemsHaveShipmentId) {
      // Return early with a flag indicating no action needed
      const validatedLineItems = input.lineItems.map((item) => {
        const extension = extensionsByLineItemId.get(item.lineItemId)
        return {
          lineItemId: item.lineItemId,
          orderLineItemExtensionId: extension!.id as string,
          currentStatus: extension!.status as string,
          reason: item.reason,
          reasonCode: item.reasonCode
        }
      })

      // Get existing shipment ID from line item extensions (for PACKED status)
      const existingShipmentId = input.lineItems.length > 0
        ? extensionsByLineItemId.get(input.lineItems[0].lineItemId)?.shipment_id
        : undefined

      logger.log(`${logPrefix} Idempotent status update, skipping workflow mutations: ${JSON.stringify({
        marketplaceOrderId: input.marketplaceOrderId,
        status: input.status,
        existingShipmentId: existingShipmentId ?? null,
        lineItemIds: input.lineItems.map((item) => item.lineItemId)
      })}`)

      return new StepResponse<ValidationResult>({
        orderId,
        stockLocationId,
        validatedLineItems,
        locationCode: input.locationCode,
        status: input.status,
        paymentIds: [] as string[],
        paymentCollectionIds: [] as string[],
        paymentProviderIds: [] as string[],
        allLineItemsInactiveAfterUpdate: false,
        paymentCollections: [] as ValidationResult['paymentCollections'],
        lineItemAmountAdjustments: [] as ValidationResult['lineItemAmountAdjustments'],
        payments: [] as ValidationResult['payments'],
        splitOrderPayment: undefined,
        skipStatusUpdate: true,
        existingShipmentId
      })
    }

    // Validate status transitions
    const validatedLineItems = input.lineItems.map((item) => {
      const extension = extensionsByLineItemId.get(item.lineItemId)

      if (!extension) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Extension not found for line item ${item.lineItemId}`
        )
      }

      const currentStatus = extension.status

      // Validate status transitions using centralized rules
      const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus as keyof typeof VALID_STATUS_TRANSITIONS]

      if (!validTransitions || !(validTransitions as readonly string[]).includes(input.status)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Line item ${item.lineItemId} cannot transition from ${currentStatus} to ${input.status}. Valid transitions from ${currentStatus} are: ${validTransitions ? validTransitions.join(', ') : 'none'}.`
        )
      }

      return {
        lineItemId: item.lineItemId,
        orderLineItemExtensionId: extension.id,
        currentStatus,
        reason: item.reason,
        reasonCode: item.reasonCode
      }
    })

    const allLineItemsInactiveAfterUpdate = orderLineItemExtensions.every(
      (extension: any) => {
        const nextStatus =
          lineItemIds.includes(extension.order_line_item_id) ?
            input.status :
            extension.status

        return [
          OrderLineItemStatus.REJECTED,
          OrderLineItemStatus.CANCELLED
        ].includes(nextStatus as OrderLineItemStatus)
      }
    )

    // Helper function to coerce numeric values
    function coerceNumeric(value: any): number {
      if (value === null || value === undefined) {
        return 0
      }
      if (typeof value === 'object' && 'value' in value) {
        return Number((value as any).value ?? 0) || 0
      }
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const lineItemAmountAdjustments = lineItemIds.map((lineItemId) => {
      const item = orderItems.find((orderItem: any) => orderItem.id === lineItemId)
      const extension = extensionsByLineItemId.get(lineItemId)

      // Get item_total from order_line_item_extension
      // Refund amount = item_total (already includes discounts)
      const itemTotal = coerceNumeric(extension?.item_total ?? 0)
      const amount = Math.max(itemTotal, 0)
      const rawAmount = amount

      return {
        lineItemId,
        amount,
        rawAmount
      }
    })

    // 5. Validate reason codes if status requires a reason
    if (STATUSES_REQUIRING_REASON.includes(input.status as any)) {
      const reasonCodes = input.lineItems
        .map((item) => item.reasonCode)
        .filter(Boolean)

      if (reasonCodes.length !== input.lineItems.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Reason code is required for all line items when status is REJECTED or CANCELLED'
        )
      }

      // Deduplicate reason codes for database query
      const uniqueReasonCodes = [...new Set(reasonCodes)]

      const { data: validReasonCodes } = await query.graph({
        entity: 'order_reject_cancel_reason_code',
        fields: ['reason_code', 'reason'],
        filters: {
          reason_code: uniqueReasonCodes.filter((r): r is string => r !== undefined)
        }
      })

      // Compare with unique reason codes count
      if (!validReasonCodes || validReasonCodes.length !== uniqueReasonCodes.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'One or more invalid reason codes provided'
        )
      }
    }

    return new StepResponse<ValidationResult>({
      orderId,
      stockLocationId,
      validatedLineItems,
      locationCode: input.locationCode,
      status: input.status,
      paymentIds,
      paymentCollectionIds,
      paymentProviderIds,
      allLineItemsInactiveAfterUpdate,
      paymentCollections,
      lineItemAmountAdjustments,
      payments,
      splitOrderPayment,
      skipStatusUpdate: false,
      existingShipmentId: undefined
    })
  }
)
