import { useDate } from '../../utils/use-date'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

export const orderStatusMap = {
  PAYMENT_PENDING: 'Payment Pending',
  RFR: 'Order Placed',
  NEW: 'Order Placed',
  ACCEPTED: 'Order Placed',
  PACKED: 'Ready to Ship',
  RIDER_ASSIGNED: 'Style Runner Assigned',
  SHIPPED: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
}

export const orderStatusDetailsMap = {
  PAYMENT_PENDING: `Your order's payment is pending.`,
  RFR : 'Order has been placed successfully.',
  NEW : 'Order has been placed successfully.',
  ACCEPTED : 'Order has been placed successfully.',
  PACKED : 'Your order has been packed and is ready to be dispatched.',
  RIDER_ASSIGNED : 'A Style Runner has been assigned to pick and process your order.',
  SHIPPED : 'Your order is out for delivery and will reach you soon.',
  DELIVERED : 'Your order has been delivered successfully.',
  // REJECTED : 'Order has been rejected by the seller.',
  CANCELLED : 'This order has been cancelled.',
}

export const orderStatusList = Object.values(orderStatusMap) || [];

export const orderStatusDateMap = {
  PAYMENT_PENDING: 'created_at',
  NEW: 'created_at',
  ACCEPTED: 'accepted_at',
  PACKED: 'packed_at',
  RIDER_ASSIGNED: 'rider_assigned_at',
  SHIPPED: 'shipped_at',
  DELIVERED: 'delivered_at',
  REJECTED: 'rejected_at',
  CANCELLED: 'cancelled_at'
}

// Timeline configuration for order status tracking
export interface TimelineItem {
  status: string
  label: string
  date: string | null
  completed: boolean
  index: number
}

export const timelineConfig = [
  {
    status: OrderLineItemStatus.NEW,
    label: 'Order Placed',
    dateField: orderStatusDateMap.NEW,
    details: orderStatusDetailsMap.NEW,
    index: 1
  },
  {
    status: OrderLineItemStatus.PACKED,
    label: 'Packed',
    dateField: orderStatusDateMap.PACKED,
    details: orderStatusDetailsMap.PACKED,
    index: 2
  },
  {
    status: OrderLineItemStatus.PACKED,
    label: 'Style Runner Assigned',
    dateField: orderStatusDateMap.RIDER_ASSIGNED,
    details: orderStatusDetailsMap.RIDER_ASSIGNED,
    index: 3
  },
  {
    status: OrderLineItemStatus.SHIPPED,
    label: 'Out For Delivery',
    dateField: orderStatusDateMap.SHIPPED,
    details: orderStatusDetailsMap.SHIPPED,
    index: 4
  },
  {
    status: OrderLineItemStatus.DELIVERED,
    label: 'Delivered',
    dateField: orderStatusDateMap.DELIVERED,
    details: orderStatusDetailsMap.DELIVERED,
    index: 5
  }
]

/**
 * Builds a timeline array from order set data
 * @param orderSet - The order set data object
 * @returns Array of timeline items with status, label, date, and completion status
 */
export function buildOrderTimeline(orderSet: {
  created_at?: string | null
  packed_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  rider_assigned_at?: string | null
  [key: string]: unknown
}): TimelineItem[] {
  const { getFullDate } = useDate()
  return timelineConfig.map(config => {
    const orderDate: string | Date | null = orderSet[config.dateField] as string | Date | null
    const completed = orderDate !== null
    const formattedDate = orderDate !== null ? getFullDate({ date: new Date(orderDate), includeTime: true }) : null

    return {
      status: config.status,
      label: config.label,
      date: completed ? formattedDate : null,
      details: config.details,
      completed,
      index: config.index
    }
  })
}
