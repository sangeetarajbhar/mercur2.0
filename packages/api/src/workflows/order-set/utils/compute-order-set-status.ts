import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

const ORDER_PROGRESS_STATUSES: OrderLineItemStatus[] = [
  OrderLineItemStatus.DELIVERED,
  OrderLineItemStatus.SHIPPED,
  OrderLineItemStatus.PACKED,
  OrderLineItemStatus.ACCEPTED
]

/**
 * Determines the derived status for an order set based on its line item statuses.
 *
 * Returns null if items are in mixed states (no clear consensus), signaling that
 * the order set status should remain unchanged.
 *
 * Cancelled line items are ignored when evaluating progression statuses, but if every
 * line item (including the cancelled ones) is cancelled, the order set is considered cancelled.
 */
export const computeOrderSetStatus = (
  statuses: (OrderLineItemStatus | null | undefined)[]
): OrderLineItemStatus | null => {
  if (!statuses?.length) {
    return OrderLineItemStatus.NEW
  }

  const normalized = statuses.filter(Boolean) as OrderLineItemStatus[]

  if (!normalized.length) {
    return OrderLineItemStatus.NEW
  }

  const allCancelled = normalized.every(
    (status) => status === OrderLineItemStatus.CANCELLED
  )

  if (allCancelled) {
    return OrderLineItemStatus.CANCELLED
  }

  const nonCancelled = normalized.filter(
    (status) => status !== OrderLineItemStatus.CANCELLED
  )

  if (!nonCancelled.length) {
    // If we reach here it means we only had cancelled entries, but that case is already handled.
    return OrderLineItemStatus.CANCELLED
  }

  for (const candidate of ORDER_PROGRESS_STATUSES) {
    if (nonCancelled.every((status) => status === candidate)) {
      return candidate
    }
  }

  if (nonCancelled.every((status) => status === OrderLineItemStatus.NEW)) {
    return OrderLineItemStatus.NEW
  }

  // Mixed states: return null to signal "keep current status"
  return null
}


