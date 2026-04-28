import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import axios from 'axios'
import {
  FRAPPE_BASE_URL,
  FRAPPE_ORDER_AUTH_TOKEN,
  FRAPPE_ORDER_CREATE_PATH,
} from '../../../subscribers/utils/constants'
import { ORDER_EXTRA_DETAIL_MODULE } from '../../../modules/order-extra-detail'
import OrderExtraDetailModuleService from '../../../modules/order-extra-detail/service'
import { COD_PAYMENT_PROVIDER } from '../../../utils/constants/payments'
import sellerOrder from '@mercurjs/core-plugin/links/order-seller-link'
import { RedisKey } from '../../../shared/utils/redisKey'
import CustomCacheModuleService from '../../../modules/cache/service'

type FrappeOrderCreateStepInput = {
  marketplaceOrderId: string
  locationCode: string
  lineItems: { lineItemId: string }[]
}

type StockLocationCache = {
  name?: string
  gst_number?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  postal_code?: string
}

interface FrappeOrderPayload {
  marketplaceOrderId: string
  packUntil: string
  estimatedDelivery: string | null
  paymentMethod: string
  amountPayable: number
  supplier?: {
    gst_number?: string
    supplier_name?: string
    address?: {
      line1: string
      line2: string
      city: string
      state: string
      postalCode: string
    }
  }
  customer: {
    name: string
    phone: string
    address: {
      line1: string
      line2: string
      locality: string
      city: string
      state: string
      postalCode: string
    }
  }
  lineItems: Array<{
    lineId: string
    sku: string
    productName: string
    lineItemStatus: string
    locationCode: string
    quantity: number
    pricing: {
      mrp: number
      salePrice: number
      totalDiscount: number
      finalPrice: number
    }
    hsnCode: string
  }>
}

type FrappeOrderCreateStepOutput = {
  success: boolean
  invoiceId?: string
  frappeStatus?: string
}

const formatDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const toNumber = (val: any): number =>
  val?.numeric_ ?? val?.numeric ?? (typeof val === 'number' ? val : 0)

export const frappeOrderCreateStep = createStep(
  'frappe-order-create',
  async (
    input: FrappeOrderCreateStepInput,
    { container }
  ): Promise<StepResponse<FrappeOrderCreateStepOutput>> => {
    if (!FRAPPE_BASE_URL || !FRAPPE_ORDER_AUTH_TOKEN) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        '[Frappe Order] Configuration missing: FRAPPE_BASE_URL and FRAPPE_ORDER_AUTH_TOKEN must be set'
      )
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const orderExtraDetailService = container.resolve(
      ORDER_EXTRA_DETAIL_MODULE
    ) as OrderExtraDetailModuleService

    // 1. Get order_extra_detail to find order_id
    const { data: orderExtraDetails } = await query.graph({
      entity: 'order_extra_detail',
      fields: ['id', 'order_id'],
      filters: {
        marketplace_order_id: input.marketplaceOrderId,
        deleted_at: { $eq: null },
      },
    })

    const orderExtraDetail = orderExtraDetails?.[0]
    if (!orderExtraDetail?.order_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `[Frappe Order] No order found for marketplace_order_id: ${input.marketplaceOrderId}`
      )
    }

    // 2. Get all order data including order_set id
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'total',
        'customer.first_name',
        'customer.last_name',
        'customer.phone',
        'shipping_address.first_name',
        'shipping_address.last_name',
        'shipping_address.address_1',
        'shipping_address.address_2',
        'shipping_address.city',
        'shipping_address.province',
        'shipping_address.postal_code',
        'shipping_address.phone',
        'items.id',
        'items.title',
        'items.quantity',
        'items.unit_price',
        'items.discount_total',
        'items.total',
        'items.variant.sku',
        'items.variant.hs_code',
        'items.variant.product.hs_code',
        'items.variant.prices.amount',
        'items.variant.prices.currency_code',
        'items.variant.prices.price_rules.attribute',
        'items.order_line_item_extension.status',
        'items.order_line_item_extension.item_total',
        'items.order_line_item_extension.item_discount_total',
        'payment_collections.payment_sessions.provider_id',
        'order_set.id',
      ],
      filters: { id: orderExtraDetail.order_id },
    })

    const order = orders?.[0] as any
    if (!order) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `[Frappe Order] Order not found: ${orderExtraDetail.order_id}`
      )
    }

    // 3. Get delivery details using order_set_id
    let deliveryDetail: any = null
    const orderSetId = order.order_set?.id
    if (orderSetId) {
      const { data: deliveryDetails } = await query.graph({
        entity: 'order_delivery_detail',
        fields: ['delivery_date', 'start_time', 'end_time'],
        filters: { order_set_id: orderSetId },
      })
      deliveryDetail = deliveryDetails?.[0]
    }

    // 4. Get seller_id and seller name; use cache for gst_number and address
    const { data: sellerOrderLinks } = await query.graph({
      entity: sellerOrder.entryPoint,
      fields: ['seller_id', 'order_id'],
      filters: { order_id: orderExtraDetail.order_id },
    })
    const sellerId = sellerOrderLinks?.[0]?.seller_id

    let sellerName = ''
    if (sellerId) {
      const { data: sellers } = await query.graph({
        entity: 'seller',
        fields: ['id', 'name'],
        filters: { id: sellerId },
      })
      sellerName = (sellers?.[0] as { name?: string })?.name ?? ''
    }

    let supplierFromCache: FrappeOrderPayload['supplier'] | undefined
    if (sellerId && input.locationCode) {
      const cacheKey = `${RedisKey.STOCK_LOCATION_CACHE}:${sellerId}:${input.locationCode}`
      const cacheService =
        container.resolve<CustomCacheModuleService>(Modules.CACHE)
      const cachedLocation =
        await cacheService.get<StockLocationCache>(cacheKey)
      if (cachedLocation) {
        supplierFromCache = {
          gst_number: cachedLocation.gst_number,
          supplier_name: sellerName,
          address:
            cachedLocation.address_1 != null || cachedLocation.city != null
              ? {
                  line1: cachedLocation.address_1 ?? '',
                  line2: cachedLocation.address_2 ?? '',
                  city: cachedLocation.city ?? '',
                  state: cachedLocation.province ?? '',
                  postalCode: cachedLocation.postal_code ?? '',
                }
              : undefined,
        }
        if (
          supplierFromCache.address &&
          !supplierFromCache.address.line1 &&
          !supplierFromCache.address.city
        ) {
          supplierFromCache.address = undefined
        }
        if (!supplierFromCache.gst_number && !supplierFromCache.address) {
          supplierFromCache = undefined
        }
      }
    }

    // 5. Determine payment method
    const paymentSession =
      order.payment_collections?.[0]?.payment_sessions?.[0]
    const paymentMethod =
      paymentSession?.provider_id === COD_PAYMENT_PROVIDER ? 'COD' : 'PREPAID'

    // 6. Calculate packUntil and estimatedDelivery
    const packUntil = formatDate(new Date())
    const estimatedDelivery = deliveryDetail?.delivery_date
      ? formatDate(new Date(deliveryDetail.delivery_date))
      : ''

    // 7. Build customer info
    const shippingAddress = order.shipping_address || {}
    const customer = order.customer || {}
    const customerName =
      [
        shippingAddress.first_name || customer.first_name,
        shippingAddress.last_name || customer.last_name,
      ]
        .filter(Boolean)
        .join(' ') || 'Customer'
    const customerPhone = shippingAddress.phone || customer.phone || ''

    // 8. Build line items — filter only packed items
    const packedLineItemIds = new Set(
      input.lineItems.map((li) => li.lineItemId)
    )
    let amountPayable = 0

    const lineItems = (order.items || [])
      .filter((item: any) => packedLineItemIds.has(item.id))
      .map((item: any) => {
        const extension = item.order_line_item_extension || {}
        const variant = item.variant || {}
        const prices = variant.prices || []

        const mrpPrice =
          prices.find((p: any) =>
            p.price_rules?.some((r: any) => r.attribute === 'mrp')
          ) ||
          prices.find((p: any) => p.currency_code === 'inr') ||
          prices[0]

        const itemTotal = toNumber(extension.item_total)
        amountPayable += itemTotal

        return {
          lineId: item.id,
          sku: variant.sku || '',
          productName: item.title || '',
          lineItemStatus: extension.status || 'PACKED',
          locationCode: input.locationCode,
          quantity: 1,
          pricing: {
            mrp: toNumber(mrpPrice?.amount),
            salePrice: toNumber(item.unit_price),
            totalDiscount: toNumber(extension.item_discount_total),
            finalPrice: itemTotal,
          },
          hsnCode: variant.hs_code,
        }
      })

    // 9. Build and send payload
    const payload: FrappeOrderPayload = {
      marketplaceOrderId: input.marketplaceOrderId,
      packUntil,
      estimatedDelivery,
      paymentMethod,
      amountPayable,
      ...(supplierFromCache && { supplier: supplierFromCache }),
      customer: {
        name: customerName,
        phone: customerPhone,
        address: {
          line1: shippingAddress.address_1 || '',
          line2: shippingAddress.address_2 || '',
          locality:
            shippingAddress.address_2 || shippingAddress.address_1 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.province || 'Maharashtra',
          postalCode: shippingAddress.postal_code || '',
        },
      },
      lineItems,
    }
    console.log(`payload for invoice creation ${input.marketplaceOrderId}: `, payload);
    for (const lineItem of payload.lineItems) {
      console.log(`lineItem.pricing for invoice creation lineItem ${lineItem.lineId} of order ${input.marketplaceOrderId}: `, lineItem.pricing);
    }

    const orderCreateUrl = `${FRAPPE_BASE_URL.replace(/\/$/, '')}${FRAPPE_ORDER_CREATE_PATH}`
    let response: any
    try {
      response = await axios.post(orderCreateUrl, payload, {
        headers: {
          Authorization: FRAPPE_ORDER_AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      })
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; data?: { _server_messages?: unknown } }
        message?: string
      }
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `[Frappe Order] Failed to create order for marketplace_order_id: ${input.marketplaceOrderId}. status: ${
          axiosError?.response?.status ?? 'unknown'
        }, server_message: ${
          axiosError?.response?.data?._server_messages
            ? JSON.stringify(axiosError.response.data._server_messages)
            : axiosError?.message ?? 'Unknown error'
        }`
      )
    }

    console.log('response', response.data)

    const message = response?.data?.message
    const invoiceId: string | undefined = message?.invoice
    const status: string | undefined = message?.status

    if (status !== 'success') {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `[Frappe Order] Frappe order creation failed for marketplace_order_id: ${input.marketplaceOrderId}. server_message: ${
          message?._server_messages
            ? JSON.stringify(message._server_messages)
            : JSON.stringify(message)
        }`
      )
    }

    if (invoiceId) {
      await orderExtraDetailService.updateOrderExtraDetails({
        id: orderExtraDetail.id,
        invoice_id: invoiceId,
      } as any)
    }

    return new StepResponse({
      success: true,
      invoiceId,
      frappeStatus: status,
    })
  }
)

export type { FrappeOrderCreateStepInput, FrappeOrderCreateStepOutput }
