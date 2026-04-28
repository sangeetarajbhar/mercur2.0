import axios from 'axios'
import moment from 'moment'
import {
  ORDER_TRACKING_URL,
  ANALYTICS_ORDER_URL,
  ANALYTICS_AUTH_HEADER
} from './constants'

const ANALYTICS_TIMEOUT_MS = 10_000

/** Fields to request when loading order_set for analytics payload building. */
export const ORDER_SET_ANALYTICS_QUERY_FIELDS = [
  '*',
  'orders.*',
  'orders.seller.*',
  'orders.customer.*',
  'orders.items.*',
  'orders.items.variant.*',
  'orders.items.variant.product.*',
  'orders.items.variant.product.categories.*',
  'orders.items.variant.product.brand.*',
  'payment_collection.*',
  'payment_collection.payment_sessions.*',
  'payment_collection.payments.*',
  'orders.shipping_address.*',
  'cart.*',
  'cart.billing_address.*',
  'cart.shipping_address.*',
  'cart.promotions.*'
] as const

/** Fields passed to getFormattedOrderSetListWorkflow for analytics. */
export const ORDER_SET_ANALYTICS_WORKFLOW_FIELDS = [
  'orders.items.*',
  'orders.items.variant.*',
  'orders.items.variant.product.*',
  'orders.items.variant.product.categories.*',
  'orders.items.variant.product.brand.*',
  'cart.*',
  'cart.billing_address.*',
  'cart.shipping_address.*',
  'orders.shipping_address.*'
] as const

export type TrackPayload = {
  event: string
  userId?: string
  anonymousId?: string
  properties: Record<string, unknown>
  context?: Record<string, unknown>
  timestamp?: string
}

export type OrderSetAnalyticsOptions = {
  eventName: string
  paymentMethod: string
  financialStatus: string
}

export type OrderSetAnalyticsData = {
  orderSet: Record<string, unknown> & {
    id: string
    cart_id?: string
    ui_order_set_id: string
    orders: Array<{
      items?: Array<{
        quantity: number
        unit_price: number
        title: string
        metadata?: { cluster_id?: string }
        variant?: {
          id: string
          sku: string
          title: string
          product?: {
            id: string
            title: string
            categories?: Array<{ name: string }>
            brand?: { name?: string } | string
          }
        }
      }>
      shipping_address?: Record<string, unknown>
    }>
  }
  primaryOrder: {
    shipping_address?: Record<string, unknown>
    seller?: { id?: string; name?: string }
  }
  customer: { phone?: string; email?: string }
  deliveryDetailRecord: {
    delivery_type?: string
    delivery_date?: string
    start_time?: string
    end_time?: string
    slot_id?: string
  } | null
  extraChargesData: Array<{ name: string; fee_amount: number }>
  formattedOrderSet: {
    subtotal?: number
    total?: number
    payment_collection?: { metadata?: { discount_total?: number } }
    cart?: { billing_address?: Record<string, unknown>; shipping_address?: Record<string, unknown> }
  } | null
  cartData: {
    subtotal?: number
    total?: number
    promotions?: Array<{ code?: string }>
    billing_address?: Record<string, unknown>
    shipping_address?: Record<string, unknown>
  } | null
  options: OrderSetAnalyticsOptions
}

export type ProductItem = {
  product_id: string
  sku: string
  name: string
  title: string
  category: string | null
  price: number
  quantity: number
  size: string | null
  vendor: string | null
  variant_id: string
  variant_title: string
}

/**
 * Merges order items from multiple orders into a single products array for analytics.
 */
export function mergeOrders(
  orders: OrderSetAnalyticsData['orderSet']['orders'] | undefined | null
): ProductItem[] {
  const products: ProductItem[] = []

  if (!orders || !Array.isArray(orders)) {
    return products
  }

  for (const order of orders) {
    if (!order.items || !Array.isArray(order.items)) {
      continue
    }

    for (const item of order.items) {
      if (!item?.variant) {
        continue
      }

      const variantId = item.variant.id
      if (!variantId) {
        continue
      }

      const product = item.variant.product
      const productId = product?.id
      if (!productId) {
        continue
      }

      const category =
        product?.categories && Array.isArray(product.categories) && product.categories.length > 0
          ? product.categories[0].name
          : null
      const variantTitle = item.variant.title ?? ''
      const size = variantTitle ? variantTitle.split('/').map((p) => p.trim())[1] ?? null : null
      const brand = product?.brand
      const vendor = typeof brand === 'string' ? brand : (brand as { name?: string })?.name ?? null

      products.push({
        product_id: productId,
        sku: item.variant.sku ?? '',
        name: item.title ?? '',
        title: product?.title ?? '',
        category,
        price: Number(item.unit_price),
        quantity: Number(item.quantity),
        size,
        vendor,
        variant_id: variantId,
        variant_title: variantTitle
      })
    }
  }

  return products
}

/**
 * Builds the analytics track payload for an order set (placed or delivered).
 */
export function buildOrderSetAnalyticsPayload(data: OrderSetAnalyticsData): TrackPayload {
  const {
    orderSet,
    primaryOrder,
    customer,
    deliveryDetailRecord,
    extraChargesData,
    formattedOrderSet,
    cartData,
    options
  } = data

  const darkStoreId = orderSet?.orders?.[0]?.items?.[0]?.metadata?.cluster_id

  const coupon: string[] = []
  if (cartData?.promotions && Array.isArray(cartData.promotions) && cartData.promotions.length > 0) {
    for (const promo of cartData.promotions) {
      if (promo?.code) {
        coupon.push(promo.code)
      }
    }
  }

  const products = mergeOrders(orderSet.orders)
  const extraCharges = extraChargesData.map((charge) => ({
    name: charge.name,
    fee_amount: Number(charge.fee_amount)
  }))

  const deliveryMoment = deliveryDetailRecord?.delivery_date
    ? moment(deliveryDetailRecord.delivery_date)
    : null
  const deliveryDate =
    deliveryMoment?.isValid() === true ? deliveryMoment.format('YYYY-MM-DD') : null
  const deliveryTime =
    deliveryDetailRecord?.start_time && deliveryDetailRecord?.end_time
      ? `${deliveryDetailRecord.start_time}-${deliveryDetailRecord.end_time}`
      : null
  const deliverySlotType = deliveryDetailRecord?.slot_id ? 'Slotted' : 'Instant'

  const userId = customer.phone ? `+91${customer.phone}` : null
  const subtotal = formattedOrderSet?.subtotal != null ? Number(formattedOrderSet.subtotal) : 0
  const total = formattedOrderSet?.total != null ? Number(formattedOrderSet.total) : 0
  const discount =
    formattedOrderSet?.payment_collection?.metadata?.discount_total != null
      ? Number(formattedOrderSet.payment_collection.metadata.discount_total)
      : 0

  const billingAddress =
    cartData?.billing_address ?? formattedOrderSet?.cart?.billing_address ?? null
  const shippingAddress =
    cartData?.shipping_address ??
    formattedOrderSet?.cart?.shipping_address ??
    primaryOrder?.shipping_address ??
    null

  const billing = billingAddress as Record<string, unknown> | null
  const shipping = shippingAddress as Record<string, unknown> | null

  return {
    event: options.eventName,
    userId: userId ?? undefined,
    properties: {
      checkout_id: orderSet.cart_id,
      order_id: orderSet.ui_order_set_id,
      subtotal,
      total,
      revenue: total,
      value: total,
      extra_charges: extraCharges,
      discount,
      coupon,
      currency: 'INR',
      internal_order_id: orderSet.id,
      billing_address_city: billing?.city,
      billing_address_state: billing?.province,
      billing_address_country: billing?.country_code,
      billing_address_zip: billing?.postal_code,
      shipping_address_city: shipping?.city,
      shipping_address_state: shipping?.province,
      shipping_address_country: shipping?.country_code,
      shipping_address_zip: shipping?.postal_code,
      cart_subtotal_amount: cartData?.subtotal != null ? Number(cartData.subtotal) : null,
      cart_total_amount: cartData?.total != null ? Number(cartData.total) : null,
      email: customer.email,
      financial_status: options.financialStatus,
      order_status_url: `${ORDER_TRACKING_URL}/orders/${orderSet.ui_order_set_id}/status`,
      payment_method: options.paymentMethod,
      source_name: 'Medusa',
      seller_id: primaryOrder?.seller?.id ?? null,
      seller_name: primaryOrder?.seller?.name ?? null,
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
      delivery_slot_type: deliverySlotType,
      delivery_type: deliveryDetailRecord?.delivery_type,
      dark_store_id: darkStoreId,
      pincode: shipping?.postal_code,
      locality: (shipping?.address_2 ?? shipping?.address_1 ?? '') as string,
      transaction_id: orderSet.ui_order_set_id,
      shopify_total_orders: 1,
      shopify_total_spent: total,
      products
    },
    timestamp: new Date().toISOString()
  }
}

/** Order set shape expected for delivered analytics (status, timestamps, tracking from DB). */
export type OrderSetDeliveredFields = {
  id: string
  ui_order_set_id: string | number
  status?: string
  created_at?: string | Date
  delivered_at?: string | Date | null
  tracking_id?: string | null
  courier_code?: string | null
  metadata?: { rider?: { name?: string } } | null
}

/**
 * Builds the analytics track payload for Order Delivered event (reduced property set).
 */
export function buildOrderDeliveredAnalyticsPayload(data: OrderSetAnalyticsData): TrackPayload {
  const {
    orderSet,
    primaryOrder,
    customer,
    deliveryDetailRecord,
    formattedOrderSet,
    cartData
  } = data

  const os = orderSet as unknown as OrderSetDeliveredFields
  const darkStoreId = orderSet?.orders?.[0]?.items?.[0]?.metadata?.cluster_id
  const products = mergeOrders(orderSet.orders)

  const deliveryMoment = deliveryDetailRecord?.delivery_date
    ? moment(deliveryDetailRecord.delivery_date)
    : null
  const deliveryDate =
    deliveryMoment?.isValid() === true ? deliveryMoment.format('YYYY-MM-DD') : null
  const deliveryTime =
    deliveryDetailRecord?.start_time && deliveryDetailRecord?.end_time
      ? `${deliveryDetailRecord.start_time}-${deliveryDetailRecord.end_time}`
      : null
  const deliverySlotType = deliveryDetailRecord?.slot_id ? 'Slotted' : 'Instant'

  const shippingAddress =
    cartData?.shipping_address ??
    formattedOrderSet?.cart?.shipping_address ??
    primaryOrder?.shipping_address ??
    null
  const shipping = shippingAddress as Record<string, unknown> | null

  const createdAt = os.created_at != null ? moment(os.created_at) : null
  const deliveredAt = os.delivered_at != null ? moment(os.delivered_at) : null
  const orderPlacedDate =
    createdAt?.isValid() === true ? createdAt.format('YYYY-MM-DD') : null
  const orderDeliveredDate =
    deliveredAt?.isValid() === true ? deliveredAt.format('YYYY-MM-DD') : null
  const userLastDeliveryDate = orderDeliveredDate

  let trackingDuration: number | null = null
  if (createdAt?.isValid() && deliveredAt?.isValid()) {
    trackingDuration = deliveredAt.diff(createdAt, 'seconds')
  }

  const userId = customer.phone ? `+91${customer.phone}` : null
  const trackingRider =
    os.metadata && typeof os.metadata === 'object' && 'rider' in os.metadata
      ? (os.metadata as { rider?: { name?: string } }).rider?.name ?? null
      : null

  return {
    event: 'Order Delivered',
    userId: userId ?? undefined,
    properties: {
      order_status: os.status ?? null,
      order_id: orderSet.ui_order_set_id,
      order_placed_date: orderPlacedDate,
      order_delivered_date: orderDeliveredDate,
      products,
      shipping_address_city: shipping?.city,
      shipping_address_state: shipping?.province,
      shipping_address_country: shipping?.country_code,
      shipping_address_zip: shipping?.postal_code,
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
      delivery_slot_type: deliverySlotType,
      delivery_type: deliveryDetailRecord?.delivery_type ?? null,
      dark_store_id: darkStoreId,
      internal_order_id: orderSet.id,
      tracking_number: os.tracking_id ?? null,
      tracking_duration: trackingDuration,
      tracking_partner: os.courier_code ?? null,
      tracking_rider: trackingRider,
      user_last_delivery_date: userLastDeliveryDate,
      source_name: 'Medusa',
      seller_id: primaryOrder?.seller?.id ?? null,
      seller_name: primaryOrder?.seller?.name ?? null,
      pincode: shipping?.postal_code ?? null,
      locality: (shipping?.address_2 ?? shipping?.address_1 ?? '') as string
    },
    timestamp: new Date().toISOString()
  }
}

/**
 * Sends an analytics track payload to the configured analytics endpoint.
 * Does not throw; logs errors and returns so the caller can complete.
 */
export async function sendOrderSetAnalytics(
  payload: TrackPayload,
  logContext: string = 'order set analytics'
): Promise<void> {
  if (!ANALYTICS_ORDER_URL || !ANALYTICS_AUTH_HEADER) {
    console.error(
      `[${logContext}] Analytics configuration missing: ANALYTICS_ORDER_URL and ANALYTICS_AUTH_HEADER must be set`
    )
    return
  }

  try {
    await axios.post(ANALYTICS_ORDER_URL, payload, {
      headers: {
        Authorization: ANALYTICS_AUTH_HEADER,
        'Content-Type': 'application/json'
      },
      timeout: ANALYTICS_TIMEOUT_MS
    })
  } catch (error) {
    const axiosError = error as { response?: { status?: number }; message?: string }
    console.error(
      `[${logContext}] Failed to send analytics event:`,
      axiosError?.response?.status,
      axiosError?.message
    )
  }
}
