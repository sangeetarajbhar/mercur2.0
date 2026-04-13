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
   * Ready for Release (RFR).
   */
  RFR = 'RFR',
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
  DELIVERED = 'DELIVERED',
  /**
   * The customer has requested a return for the order line item.
   */
  RETURNED_REQUESTED = 'RETURN REQUESTED',
  /**
   * The return request has been cancelled.
   */
  RETURN_CANCELLED = 'RETURN CANCELLED',
  /**
   * The order line item has been returned by the customer.
   */
  RETURNED = 'RETURNED',
  /**
   * The order line item has been refunded.
   */
  REFUNDED = 'REFUNDED'
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
   * A rider has been assigned to the shipment.
   */
  RIDER_ASSIGNED = 'RIDER_ASSIGNED',
  /**
   * The shipment has been shipped and is in transit.
   */
  SHIPPED = 'SHIPPED',
  /**
   * The shipment has been delivered to the customer.
   */
  DELIVERED = 'DELIVERED',
  /**
   * The shipment was undelivered (RTO - Return to Origin).
   */
  UNDELIVERED = 'UNDELIVERED'
}

/**
 * Status transition rules
 * Defines valid status transitions for order line items
 */
export const VALID_STATUS_TRANSITIONS: Record<OrderLineItemStatus, OrderLineItemStatus[]> = {
  [OrderLineItemStatus.PAYMENT_PENDING]: [
    OrderLineItemStatus.RFR,
    OrderLineItemStatus.CANCELLED
  ],
  [OrderLineItemStatus.NEW]: [
    OrderLineItemStatus.ACCEPTED,
    OrderLineItemStatus.REJECTED,
    OrderLineItemStatus.CANCELLED
  ],
  [OrderLineItemStatus.ACCEPTED]: [
    OrderLineItemStatus.PACKED,
    OrderLineItemStatus.REJECTED,
    OrderLineItemStatus.CANCELLED
  ],
  [OrderLineItemStatus.REJECTED]: [],
  [OrderLineItemStatus.CANCELLED]: [],
  [OrderLineItemStatus.PACKED]: [OrderLineItemStatus.SHIPPED],
  [OrderLineItemStatus.SHIPPED]: [OrderLineItemStatus.DELIVERED],
  // [OrderLineItemStatus.DELIVERED]: []
  [OrderLineItemStatus.DELIVERED]: [OrderLineItemStatus.RETURNED_REQUESTED],
  [OrderLineItemStatus.RETURNED_REQUESTED]: [OrderLineItemStatus.RETURNED, OrderLineItemStatus.RETURN_CANCELLED],
  [OrderLineItemStatus.RETURN_CANCELLED]: [],
  [OrderLineItemStatus.RETURNED]: [OrderLineItemStatus.REFUNDED],
  [OrderLineItemStatus.REFUNDED]: [],
  [OrderLineItemStatus.RFR]: [OrderLineItemStatus.NEW]
}

/**
 * Statuses that require reason and reason_code fields
 */
export const STATUSES_REQUIRING_REASON = [
  OrderLineItemStatus.REJECTED,
  OrderLineItemStatus.CANCELLED
] as const

