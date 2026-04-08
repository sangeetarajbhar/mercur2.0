import type { Knex } from 'knex'

import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import { parseStartEndDayRange } from '../../../utils/helpers/common-filter-helpers'
import { getVendorOrdersListWorkflow } from '../../../workflows/order/workflows'
import { sellerOrderDefaultFields } from './query-config'
import CacheModuleService from '../../../modules/cache/service'
import { getStockLocationIdsForPartnerFromCache } from '../../../shared/utils/cache/seller-partner-stock-location-ids-cache'
import {
  getLatestByCreatedAt,
  paginateSellerOrderIdsViaOrderExtraDetail,
  sortOrdersByIdList
} from './utils'
import { SellerGetOrderParamsType } from './validators'

/**
 * @oas [get] /vendor/orders
 * operationId: "VendorListOrders"
 * summary: "List Orders"
 * description: "Retrieves a list of orders for the authenticated vendor."
 * x-authenticated: true
 * parameters:
 *   - name: offset
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *     description: The number of items to skip before starting to collect the result set.
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *     description: The number of items to return.
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Comma-separated fields to include in the response.
 *   - name: order
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: The order of the returned items.
 *   - name: created_at
 *     in: query
 *     schema:
 *       type: object
 *     required: false
 *     description: Filter by created at date range
 *   - name: status
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Filter by order status
 *   - name: fulfillment_status
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Filter by fulfillment status
 *   - name: payment_status
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Filter by payment status
 *   - name: q
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Search query for filtering orders
 *   - name: partnerId
 *     in: query
 *     schema:
 *       type: string
 *     required: true
 *     description: Partner id; orders are limited to OED stock locations for this partner (seller_partner_stock_location_ids cache).
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             orders:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/VendorOrderDetails"
 *             count:
 *               type: integer
 *               description: The total number of items available
 *             offset:
 *               type: integer
 *               description: The number of items skipped before these items
 *             limit:
 *               type: integer
 *               description: The number of items per page
 * tags:
 *   - Vendor Orders
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest<SellerGetOrderParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(
    ContainerRegistrationKeys.PG_CONNECTION
  ) as Knex

  const q = req.validatedQuery as SellerGetOrderParamsType
  const sellerId = q.seller_id
  const partnerId = q.partnerId

  const pageNumber = parseInt(q.pageNumber ?? '', 10) || 1
  const pageSize = parseInt(q.pageSize ?? '', 10) || 25
  const order = q.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  // `startDate` / `endDate` filter `order.created_at` in the OED+order SQL path (same bounds as parseStartEndDayRange).
  const startDate = q.startDate
  const endDate = q.endDate

  // Calculate offset from page number
  const offset = (pageNumber - 1) * pageSize

  /* eslint-disable @typescript-eslint/no-unused-vars -- strip listing-only fields before passing the rest to the order workflow */
  const {
    seller_id,
    partnerId: _partnerIdField,
    pageNumber: _pageNumberField,
    pageSize: _pageSizeField,
    order: _orderField,
    startDate: _startDateField,
    endDate: _endDateField,
    created_at: _orderCreatedAtFilter,
    status: _statusFilterable,
    ...orderFilters
  } = req.filterableFields
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const { startInclusive, endExclusive } = parseStartEndDayRange(
    startDate,
    endDate
  )

  const cacheService = req.scope.resolve<CacheModuleService>(Modules.CACHE)
  const partnerStockLocationIds = await getStockLocationIdsForPartnerFromCache(
    cacheService,
    sellerId,
    partnerId
  )
  console.log(`partnerStockLocationIds`, partnerStockLocationIds)

  const { orderIds: sellerOrderIds, totalCount, orderExtraDetails } =
    await paginateSellerOrderIdsViaOrderExtraDetail(knex, {
      sellerId,
      partnerStockLocationIds,
      startDate: startInclusive,
      endExclusive,
      status: q.status,
      limit: pageSize,
      offset,
      sortDesc: order === 'DESC'
    })

  if (sellerOrderIds.length === 0) {
    return res.json({
      orders: [],
      pagination: {
        pageSize,
        pageNumber,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    })
  }

  // `status` is validated against `order_status_enum` values; applied in SQL; other order filters run in the workflow.
  const { result } = await getVendorOrdersListWorkflow(req.scope).run({
    input: {
      fields: sellerOrderDefaultFields,
      variables: {
        filters: {
          ...orderFilters,
          id: sellerOrderIds
        },
        skip: 0,
        take: sellerOrderIds.length,
        order: {
          created_at: order
        }
      }
    }
  })

  const { rows } = result as { rows?: unknown[] }

  const totalPages = Math.ceil(totalCount / pageSize)

  const rowsOrdered = Array.isArray(rows)
    ? sortOrdersByIdList(rows as { id: string }[], sellerOrderIds)
    : rows

  if (!rowsOrdered || !Array.isArray(rowsOrdered) || rowsOrdered.length === 0) {
    return res.json({
      orders: [],
      pagination: {
        pageSize,
        pageNumber,
        totalCount,
        totalPages
      }
    })
  }

  const paginatedRows = rowsOrdered

  // Add pricing information to each line item without consolidating
  const rowsWithConsolidatedItems = paginatedRows.map((order: any) => {
    if (!order.items || !Array.isArray(order.items)) {
      return order
    }

    // Add price breakdown to each individual item (quantity is always 1)
    const itemsWithPricing = order.items.map((item: any) => {
      const unitPrice = item.unit_price || 0
      const discountTotal = item.discount_total || 0
      const originalPrice = item.compare_at_unit_price || unitPrice

      return {
        ...item,
        actual_allocated_quantity:
          item.metadata?.allocatedLocations?.[0]?.allocatedQuantity || null,
        pricing: {
          original_price: originalPrice, // MSRP from variant pricing
          sale_price: unitPrice, // Current listing price
          discount_per_unit: discountTotal, // Line-level discount (qty=1)
          final_price: unitPrice - discountTotal // Final price after discounts
        }
      }
    })

    return {
      ...order,
      items: itemsWithPricing
    }
  })

  // Get all order IDs and order set IDs
  const orderIds = rowsWithConsolidatedItems
    .map((order: any) => order.id)
    .filter(Boolean)
  const orderSetIds = rowsWithConsolidatedItems
    .map((order: any) => order.order_set?.id)
    .filter(Boolean)

  // `orderExtraDetails` comes from the listing Knex query; only delivery details are loaded here.
  let ordersWithDetails = rowsWithConsolidatedItems
  if (orderIds.length > 0) {
    try {
      const { data: deliveryDetails = [] } =
        orderSetIds.length > 0
          ? await query.graph({
              entity: 'order_delivery_detail',
              filters: { order_set_id: orderSetIds },
              fields: ['*']
            })
          : { data: [] }

      // Create a map of order_id to order_extra_detail
      const extraDetailsMap = new Map<string, (typeof orderExtraDetails)[number]>()
      for (const detail of orderExtraDetails) {
        if (detail.order_id) {
          extraDetailsMap.set(detail.order_id, detail)
        }
      }

      // Create a map of order_set_id to delivery_detail
      const deliveryDetailsMap = new Map()
      if (deliveryDetails && Array.isArray(deliveryDetails)) {
        deliveryDetails.forEach((detail: any) => {
          if (detail.order_set_id) {
            deliveryDetailsMap.set(detail.order_set_id, detail)
          }
        })
      }

      // Get all unique stock location IDs and customer address IDs
      const stockLocationIds = Array.from(
        new Set(
          orderExtraDetails.map((d) => d.stock_location_id).filter(Boolean)
        )
      )

      const customerAddressIds = Array.from(
        new Set(
          rowsWithConsolidatedItems
            .map(
              (order: any) =>
                order.shipping_address?.metadata?.customer_address_id
            )
            .filter(Boolean) || []
        )
      )

      // Fetch stock locations and customer addresses in parallel
      const [stockLocationsResult, customerAddressesResult] = await Promise.all(
        [
          stockLocationIds.length > 0
            ? query.graph({
                entity: 'stock_location',
                filters: { id: stockLocationIds },
                fields: [
                  'id',
                  'name',
                  'stock_location_section.partner_wh_code',
                  'stock_location_extension.partner_id'
                ]
              })
            : Promise.resolve({ data: [] }),
          customerAddressIds.length > 0
            ? query.graph({
                entity: 'customer_address',
                filters: { id: customerAddressIds },
                fields: ['id', 'metadata']
              })
            : Promise.resolve({ data: [] })
        ]
      )

      // Build stock locations map
      const stockLocationsMap = new Map()
      const stockLocations = stockLocationsResult.data
      if (stockLocations && Array.isArray(stockLocations)) {
        stockLocations.forEach((location: any) => {
          if (location.id) {
            stockLocationsMap.set(location.id, location)
          }
        })
      }

      // Build customer addresses map
      const customerAddressMap = new Map<
        string,
        {
          latitude: number | null | undefined
          longitude: number | null | undefined
          landmark: string | null | undefined
        }
      >()
      const customerAddresses = customerAddressesResult.data
      if (customerAddresses && Array.isArray(customerAddresses)) {
        customerAddresses.forEach((address: any) => {
          if (address.id) {
            customerAddressMap.set(address.id, {
              latitude:
                address.metadata?.latitude || address.metadata?.lat || null,
              longitude:
                address.metadata?.longitude || address.metadata?.lng || null,
              landmark: address.metadata?.landmark || null
            })
          }
        })
      }

      // Add location details, delivery details, and payment info to each order
      ordersWithDetails = rowsWithConsolidatedItems.map((order: any) => {
        const locationDetail = extraDetailsMap.get(order.id) || null
        const stockLocationDetail = locationDetail?.stock_location_id
          ? stockLocationsMap.get(locationDetail.stock_location_id) || null
          : null
        const deliveryDetail = order.order_set?.id
          ? deliveryDetailsMap.get(order.order_set.id) || null
          : null

        // Get latitude and longitude from customer address if available
        const customerAddressId =
          order.shipping_address?.metadata?.customer_address_id
        const customerAddress = customerAddressId
          ? customerAddressMap.get(customerAddressId)
          : null
        const latitude = customerAddress?.latitude ?? null
        const longitude = customerAddress?.longitude ?? null
        const landmark = customerAddress?.landmark ?? null
        if (landmark) {
          order.shipping_address.address_2 =
            `${landmark}, ${order.shipping_address.address_2}`.trim()
        }

        // Extract payment provider from payment_collections (already fetched in query)
        const latestPaymentCollection = getLatestByCreatedAt(
          order.payment_collections as any[]
        )
        const latestPayment = getLatestByCreatedAt(
          (latestPaymentCollection?.payments as any[]) ?? null
        )
        // const latestPaymentSession = getLatestByCreatedAt(
        //   (latestPaymentCollection?.payment_sessions as any[]) ?? null
        // )

        const providerId =
          (latestPayment as any)?.provider_id ??
          // (latestPaymentSession as any)?.provider_id ??
          null

        // Map provider ID to readable name
        let paymentMethod: string | null = null

        const paymentCollection = latestPaymentCollection

        if (paymentCollection) {
          if (providerId) {
            paymentMethod =
              providerId === 'pp_system_default' ? 'COD' : 'PREPAID'
          }
          // delete (order as any).payment_collections
        }

        order.payment_method = paymentMethod

        // const address_2 = order.shipping_address?.metadata?.landmark
        // // console.log('address_2', address_2)
        // if (address_2) {
        //   // console.log('address_2 inside', address_2)
        //   order.shipping_address.address_2 = `${address_2}, ${order.shipping_address.address_2}`
        // }

        const paymentInfo = paymentCollection
          ? {
              payment_method: paymentMethod,
              provider_id: providerId || null,
              status: paymentCollection.status,
              amount: paymentCollection.amount,
              authorized_amount: paymentCollection.authorized_amount,
              captured_amount: paymentCollection.captured_amount,
              refunded_amount: paymentCollection.refunded_amount
            }
          : null

        const ext = stockLocationDetail?.stock_location_extension
        const partnerIdFromLocation = Array.isArray(ext)
          ? ext[0]?.partner_id
          : ext?.partner_id

        return {
          ...order,
          location_detail: locationDetail
            ? {
                ...locationDetail,
                location_name: stockLocationDetail?.name,
                partner_wh_code:
                  stockLocationDetail?.stock_location_section?.partner_wh_code,
                partner_id: partnerIdFromLocation ?? null,
                latitude,
                longitude
              }
            : null,
          delivery_detail: deliveryDetail,
          payment_info: paymentInfo
          // payment_collections: order.payment_collections
        }
      })
    } catch (error) {
      console.error('Error fetching order details:', error)
      // If query fails, just return orders without additional details
    }
  }

  res.json({
    orders: ordersWithDetails,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages
    }
  })
}
