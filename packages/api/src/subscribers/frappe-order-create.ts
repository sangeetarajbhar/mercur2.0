// import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
// import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
// import axios from 'axios'
// import {
//   FRAPPE_BASE_URL,
//   FRAPPE_ORDER_AUTH_TOKEN,
//   FRAPPE_ORDER_CREATE_PATH,
// } from './utils/constants'
// import { ORDER_EXTRA_DETAIL_MODULE } from '../modules/order-extra-detail'
// import OrderExtraDetailModuleService from '../modules/order-extra-detail/service'
// import { COD_PAYMENT_PROVIDER } from '../utils/constants/payments'
// import sellerOrder from '../links/seller-order'
// import { RedisKey } from '../shared/utils/redisKey'
// import CustomCacheModuleService from '../modules/cache/service'

// type OrderPackedEventData = {
//   marketplaceOrderId: string
//   shipmentId: string | null
//   locationCode: string
//   lineItems: { lineItemId: string }[]
// }

// type StockLocationCache = {
//   name?: string
//   gst_number?: string
//   address_1?: string
//   address_2?: string
//   city?: string
//   province?: string
//   postal_code?: string
// }

// interface FrappeOrderPayload {
//   marketplaceOrderId: string
//   packUntil: string
//   estimatedDelivery: string | null
//   paymentMethod: string
//   amountPayable: number
//   supplier?: {
//     gst_number?: string
//     supplier_name?: string
//     address?: {
//       line1: string
//       line2: string
//       city: string
//       state: string
//       postalCode: string
//     }
//   }
//   customer: {
//     name: string
//     phone: string
//     address: {
//       line1: string
//       line2: string
//       locality: string
//       city: string
//       state: string
//       postalCode: string
//     }
//   }
//   lineItems: Array<{
//     lineId: string
//     sku: string
//     productName: string
//     lineItemStatus: string
//     locationCode: string
//     quantity: number
//     pricing: {
//       mrp: number
//       salePrice: number
//       totalDiscount: number
//       finalPrice: number
//     }
//     hsnCode: string
//   }>
// }

// export default async function frappeOrderCreateHandler(
//   { event: { data }, container }: SubscriberArgs<OrderPackedEventData>
// ) {
//   if (!FRAPPE_BASE_URL || !FRAPPE_ORDER_AUTH_TOKEN) {
//     console.warn(
//       '[Frappe Order] Configuration missing: FRAPPE_BASE_URL and FRAPPE_ORDER_AUTH_TOKEN must be set'
//     )
//     return
//   }

//   const query = container.resolve(ContainerRegistrationKeys.QUERY)
//   const orderExtraDetailService = container.resolve(
//     ORDER_EXTRA_DETAIL_MODULE
//   ) as OrderExtraDetailModuleService

//   try {
//     // 1. Get order_extra_detail to find order_id
//     const { data: orderExtraDetails } = await query.graph({
//       entity: 'order_extra_detail',
//       fields: ['id', 'order_id'],
//       filters: {
//         marketplace_order_id: data.marketplaceOrderId,
//         deleted_at: { $eq: null },
//       },
//     })

//     const orderExtraDetail = orderExtraDetails?.[0]
//     if (!orderExtraDetail?.order_id) {
//       console.warn(
//         '[Frappe Order] No order found for marketplace_order_id:',
//         data.marketplaceOrderId
//       )
//       return
//     }

//     // 2. Get all order data including order_set id
//     const { data: orders } = await query.graph({
//       entity: 'order',
//       fields: [
//         'id',
//         'total',
//         'customer.first_name',
//         'customer.last_name',
//         'customer.phone',
//         'shipping_address.first_name',
//         'shipping_address.last_name',
//         'shipping_address.address_1',
//         'shipping_address.address_2',
//         'shipping_address.city',
//         'shipping_address.province',
//         'shipping_address.postal_code',
//         'shipping_address.phone',
//         'items.id',
//         'items.title',
//         'items.quantity',
//         'items.unit_price',
//         'items.discount_total',
//         'items.total',
//         'items.variant.sku',
//         'items.variant.hs_code',
//         'items.variant.product.hs_code',
//         'items.variant.prices.amount',
//         'items.variant.prices.currency_code',
//         'items.variant.prices.price_rules.attribute',
//         'items.order_line_item_extension.status',
//         'items.order_line_item_extension.item_total',
//         'items.order_line_item_extension.item_discount_total',
//         'payment_collections.payment_sessions.provider_id',
//         'order_set.id',
//       ],
//       filters: { id: orderExtraDetail.order_id },
//     })

//     const order = orders?.[0] as any
//     if (!order) {
//       console.warn('[Frappe Order] Order not found:', orderExtraDetail.order_id)
//       return
//     }

//     // 3. Get delivery details using order_set_id
//     let deliveryDetail: any = null
//     const orderSetId = order.order_set?.id
//     if (orderSetId) {
//       const { data: deliveryDetails } = await query.graph({
//         entity: 'order_delivery_detail',
//         fields: ['delivery_date', 'start_time', 'end_time'],
//         filters: { order_set_id: orderSetId },
//       })
//       deliveryDetail = deliveryDetails?.[0]
//     }

//     // 4. Get seller_id and seller name (from seller table); use cache for gst_number and address
//     const { data: sellerOrderLinks } = await query.graph({
//       entity: sellerOrder.entryPoint,
//       fields: ['seller_id', 'order_id'],
//       filters: { order_id: orderExtraDetail.order_id },
//     })
//     const sellerId = sellerOrderLinks?.[0]?.seller_id

//     let sellerName = ''
//     if (sellerId) {
//       const { data: sellers } = await query.graph({
//         entity: 'seller',
//         fields: ['id', 'name'],
//         filters: { id: sellerId },
//       })
//       sellerName = (sellers?.[0] as { name?: string })?.name ?? ''
//     }

//     let supplierFromCache: FrappeOrderPayload['supplier'] | undefined
//     if (sellerId && data.locationCode) {
//       const cacheKey = `${RedisKey.STOCK_LOCATION_CACHE}:${sellerId}:${data.locationCode}`
//       const cacheService = container.resolve<CustomCacheModuleService>(Modules.CACHE)
//       const cachedLocation = await cacheService.get<StockLocationCache>(cacheKey)
//       if (cachedLocation) {
//         supplierFromCache = {
//           gst_number: cachedLocation.gst_number,
//           supplier_name: sellerName,
//           address:
//             cachedLocation.address_1 != null || cachedLocation.city != null
//               ? {
//                   line1: cachedLocation.address_1 ?? '',
//                   line2: cachedLocation.address_2 ?? '',
//                   city: cachedLocation.city ?? '',
//                   state: cachedLocation.province ?? '',
//                   postalCode: cachedLocation.postal_code ?? '',
//                 }
//               : undefined,
//         }
//         if (supplierFromCache.address && !supplierFromCache.address.line1 && !supplierFromCache.address.city) {
//           supplierFromCache.address = undefined
//         }
//         if (!supplierFromCache.gst_number && !supplierFromCache.address) {
//           supplierFromCache = undefined
//         }
//       }
//     }

//     // 5. Determine payment method
//     const paymentSession = order.payment_collections?.[0]?.payment_sessions?.[0]
//     const paymentMethod = paymentSession?.provider_id === COD_PAYMENT_PROVIDER ? 'COD' : 'PREPAID'

//     // 6. Calculate packUntil (current time) and estimatedDelivery
//     // Format date as "YYYY-MM-DD HH:mm:ss" for Frappe
//     const formatDate = (date: Date): string => {
//       const pad = (n: number) => n.toString().padStart(2, '0')
//       return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
//     }

//     const packUntil = formatDate(new Date())
//     const estimatedDelivery = deliveryDetail?.delivery_date
//       ? formatDate(new Date(deliveryDetail.delivery_date))
//       : ''

//     // 7. Build customer info
//     const shippingAddress = order.shipping_address || {}
//     const customer = order.customer || {}
//     const customerName = [
//       shippingAddress.first_name || customer.first_name,
//       shippingAddress.last_name || customer.last_name,
//     ].filter(Boolean).join(' ') || 'Customer'
//     const customerPhone = shippingAddress.phone || customer.phone || ''

//     // 8. Build line items - filter only packed items
//     const packedLineItemIds = new Set(data.lineItems.map((li) => li.lineItemId))
//     let amountPayable = 0

//     // Helper to extract numeric value from BigNumber or return as-is
//     const toNumber = (val: any): number => 
//       val?.numeric_ ?? val?.numeric ?? (typeof val === 'number' ? val : 0)

//     const lineItems = (order.items || [])
//       .filter((item: any) => packedLineItemIds.has(item.id))
//       .map((item: any) => {
//         const extension = item.order_line_item_extension || {}
//         const variant = item.variant || {}
//         const prices = variant.prices || []

//         // Get MRP from variant prices (look for price with 'mrp' rule or first INR price)
//         const mrpPrice = prices.find(
//           (p: any) => p.price_rules?.some((r: any) => r.attribute === 'mrp')
//         ) || prices.find((p: any) => p.currency_code === 'inr') || prices[0]

//         const itemTotal = toNumber(extension.item_total)

//         // Sum item_total for amountPayable
//         amountPayable += itemTotal

//         return {
//           lineId: item.id,
//           sku: variant.sku || '',
//           productName: item.title || '',
//           lineItemStatus: extension.status || 'PACKED',
//           locationCode: data.locationCode,
//           quantity: 1,
//           pricing: {
//             mrp: toNumber(mrpPrice?.amount),
//             salePrice: toNumber(item.unit_price),
//             totalDiscount: toNumber(extension.item_discount_total),
//             finalPrice: itemTotal,
//           },
//           hsnCode: variant.hs_code,
//         }
//       })

//     // 9. Build and send payload
//     const payload: FrappeOrderPayload = {
//       marketplaceOrderId: data.marketplaceOrderId,
//       packUntil,
//       estimatedDelivery,
//       paymentMethod,
//       amountPayable,
//       ...(supplierFromCache && { supplier: supplierFromCache }),
//       customer: {
//         name: customerName,
//         phone: customerPhone,
//         address: {
//           line1: shippingAddress.address_1 || '',
//           line2: shippingAddress.address_2 || '',
//           locality: shippingAddress.address_2 || shippingAddress.address_1 || '',
//           city: shippingAddress.city || '',
//           state: shippingAddress.province || 'Maharashtra',
//           postalCode: shippingAddress.postal_code || '',
//         },
//       },
//       lineItems,
//     }

//     const orderCreateUrl = `${FRAPPE_BASE_URL.replace(/\/$/, '')}${FRAPPE_ORDER_CREATE_PATH}`
//     const response = await axios.post(orderCreateUrl, payload, {
//       headers: {
//         Authorization: FRAPPE_ORDER_AUTH_TOKEN,
//         'Content-Type': 'application/json',
//       },
//       timeout: 15000,
//     })

//     console.log('response', response.data)

//     const message = (response as any)?.data?.message
//     const invoice_id: string | undefined = message?.invoice
//     const status: string | undefined = message?.status

//     if (status === 'success' && invoice_id) {
//       try {
//         await orderExtraDetailService.updateOrderExtraDetails({
//           id: orderExtraDetail.id,
//           invoice_id: invoice_id,
//         } as any)
//       } catch (dbError) {
//         console.error(
//           '[Frappe Order] Failed to update invoice_id on order_extra_detail:',
//           dbError
//         )
//       }
//     } else {
//       console.warn(
//         '[Frappe Order] Unexpected response from Frappe order API, skipping invoice_id update',
//         message
//       )
//     }
//   } catch (error: unknown) {
//     const axiosError = error as {
//       response?: { status?: number; data?: { _server_messages?: unknown } }
//       message?: string
//     }
//     console.error(
//       '[Frappe Order] Failed to create order:',
//       axiosError?.response?.status,
//       axiosError?.response?.data?._server_messages
//     )
//   }
// }

// export const config: SubscriberConfig = {
//   event: 'order.packed',
//   context: {
//     subscriberId: 'frappe-order-create-handler',
//   },
// }
