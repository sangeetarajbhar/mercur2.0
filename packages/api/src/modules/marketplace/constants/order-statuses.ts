/**
 * Order Line Item Extension Status Enum
 * Defines all possible statuses for order line items in the fulfillment lifecycle
 */
export enum OrderLineItemStatus {
  /**
   * The order line item is awaiting payment (for prepaid orders).
   */
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  /**
   * The order line item is newly created and awaiting processing.
   */
  NEW = 'NEW',
  /**
   * The order line item has been accepted by the vendor.
   */
  ACCEPTED = 'ACCEPTED',
  /**
   * The order line item has been rejected by the vendor.
   */
  REJECTED = 'REJECTED',
  /**
   * The order line item has been cancelled.
   */
  CANCELLED = 'CANCELLED',
  /**
   * The order line item has been packed and ready for shipment.
   */
  PACKED = 'PACKED',
  /**
   * The order line item has been shipped.
   */
  SHIPPED = 'SHIPPED',
  /**
   * The order line item has been delivered to the customer.
   */
  DELIVERED = 'DELIVERED'
}

/**
 * Shipment Status Enum
 * Defines all possible statuses for shipments
 */
export enum ShipmentStatus {
  /**
   * The shipment has been packed and awaiting dispatch.
   */
  PACKED = 'PACKED',
  /**
   * The shipment has been shipped and is in transit.
   */
  SHIPPED = 'SHIPPED',
  /**
   * The shipment has been delivered to the customer.
   */
  DELIVERED = 'DELIVERED'
}

/**
 * Status transition rules
 * Defines valid status transitions for order line items
 */
export const VALID_STATUS_TRANSITIONS: Record<OrderLineItemStatus, OrderLineItemStatus[]> = {
  [OrderLineItemStatus.PAYMENT_PENDING]: [
    OrderLineItemStatus.NEW,
    OrderLineItemStatus.CANCELLED
  ],
  [OrderLineItemStatus.NEW]: [
    OrderLineItemStatus.ACCEPTED,
    OrderLineItemStatus.REJECTED,
    OrderLineItemStatus.CANCELLED
  ],
  [OrderLineItemStatus.ACCEPTED]: [OrderLineItemStatus.PACKED],
  [OrderLineItemStatus.REJECTED]: [],
  [OrderLineItemStatus.CANCELLED]: [],
  [OrderLineItemStatus.PACKED]: [OrderLineItemStatus.SHIPPED],
  [OrderLineItemStatus.SHIPPED]: [OrderLineItemStatus.DELIVERED],
  [OrderLineItemStatus.DELIVERED]: []
}

/**
 * Statuses that require reason and reason_code fields
 */
export const STATUSES_REQUIRING_REASON = [
  OrderLineItemStatus.REJECTED,
  OrderLineItemStatus.CANCELLED
] as const

