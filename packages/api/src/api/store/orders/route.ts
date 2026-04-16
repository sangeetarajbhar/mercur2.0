import { getOrdersListWorkflow } from "@medusajs/medusa/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes, OrderDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { transformOrderThumbnails } from '../../utils/middlewares/products/transform-image-urls'
import { defaultGetOrderFields } from "./query-config"
import CartOrderExtraChargeModuleService from '../../../modules/cart-order-extra-charge/service'
import { CART_ORDER_EXTRA_CHARGE_MODULE } from '../../../modules/cart-order-extra-charge'
import { orderStatusMap } from "./utils"
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

// Define order delivery detail type
interface OrderDeliveryDetail {
  id: string
  order_set_id: string
  delivery_type: string
  delivery_date: Date | null
  start_time: string | null
  end_time: string | null
  slot_id: string | null
  created_at: Date
  updated_at: Date
}

// Define line item type that can handle both our custom items and Medusa's items
interface LineItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  [key: string]: unknown
}

// Define extra charge type
interface ExtraCharge {
  id: string
  name: string | null
  amount: number
  description: string | null
  metadata: Record<string, unknown> | null
}

// OrderWithSet interface will be used for handling order_set field
interface OrderWithSet {
  id: string
  items: unknown[] | null
  total: number
  currency_code: string
  order_set?: {
    id: string
    created_at: Date | null
    display_id: string | null
    cart_id: string
    status?: string | null
  }
  [key: string]: unknown
}

// Custom response type for order sets
interface StoreOrderSetListResponse {
  order_sets: Array<{
    id: string
    // orders: OrderWithoutItems[]
    items: LineItem[]
    created_at: Date | string | null
    display_id: string | null
    status?: string | null
    status_message?: string | null
    payment_status?: string | null
    total: number
    currency_code: string | null
    delivery_detail: OrderDeliveryDetail | null
    extra_charges: ExtraCharge[]
    extra_charge_total: number
  }>
  count: number
  offset: number
  limit: number
}

type OrderSetRecord = {
  id: string
  display_id?: string | null
  status?: string | null
  created_at?: Date | string | null
  cart_id?: string | null
  orders?: Array<{
    id: string
  }>
  [key: string]: unknown
}

export const GET = async (
  req: AuthenticatedMedusaRequest<HttpTypes.StoreOrderFilters>,
  res: MedusaResponse<StoreOrderSetListResponse>
) => {
  let resolution = "3x";

  // Extract resolution from raw query fields string (before transformation)
  if (req.query.fields && typeof req.query.fields === 'string') {
    const fieldsString = req.query.fields;

    // Look for resolution=<value> pattern in the fields string
    const resolutionMatch = fieldsString.match(/resolution=(\w+)/);
    if (resolutionMatch) {
      resolution = resolutionMatch[1];
    }

    // Also check for thumbnail_resolution=<value>
    const thumbnailResolutionMatch = fieldsString.match(/thumbnail_resolution=(\w+)/);
    if (thumbnailResolutionMatch) {
      resolution = thumbnailResolutionMatch[1];
    }
  }

  // Safety check: Remove resolution from queryConfig.fields array if it somehow got through
  // (Medusa's validator should already filter this out, but this is a safeguard)
  if (req.queryConfig.fields && Array.isArray(req.queryConfig.fields)) {
    req.queryConfig.fields = req.queryConfig.fields.filter((field) => {
      if (typeof field === 'string') {
        return !field.includes('resolution=') && !field.includes('thumbnail_resolution=');
      }
      return true;
    });
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderSetPagination = {
    ...req.queryConfig.pagination,
    order: {
      created_at: 'DESC'
    }
  }

  //*get order set ids in descending order
  const {
    data: orderSetRecordsRaw,
    metadata
  } = await query.graph({
    entity: 'order_set',
    fields: ['id', 'ui_order_set_id', 'display_id', 'status', 'created_at', 'cart_id', 'orders.id', 'metadata', 'rider_assigned_at'],
    filters: {
      customer_id: req.auth_context.actor_id
    },
    pagination: orderSetPagination
  })

  //*validate structure of orderSets
  const orderSetRecords = (orderSetRecordsRaw ?? []) as OrderSetRecord[]

  //*Get all order set IDs and filter out undefined IDs
  const orderSetIds = orderSetRecords
    .map((orderSet) => orderSet.id)
    .filter((id): id is string => Boolean(id))

  if (!orderSetIds.length) {
    res.json({
      order_sets: [],
      count: metadata?.count ?? 0,
      offset: metadata?.skip ?? 0,
      limit: metadata?.take ?? (req.queryConfig.pagination?.take ?? 0)
    })
    return
  }

  const orderSetMap = new Map<string, OrderSetRecord>(
    orderSetRecords.map((orderSet) => [orderSet.id, orderSet])
  )

  //*Get all order IDs from order sets
  const orderIds = orderSetRecords
    .flatMap((orderSet) => orderSet.orders?.map((order) => order.id) ?? [])
    .filter((id): id is string => Boolean(id))
  //*Get unique order IDs to fetch
  const uniqueOrderIds = Array.from(new Set(orderIds))

  if (!uniqueOrderIds.length) {
    res.json({
      order_sets: orderSetRecords.map((orderSet) => ({
        id: orderSet.id,
        status: orderSet.status ?? null,
        status_message: orderSet.status
          ? (orderStatusMap[orderSet.status as keyof typeof orderStatusMap] || orderSet.status)
          : null,
        payment_status: null,
        items: [],
        created_at: orderSet.created_at ?? null,
        display_id: orderSet.display_id ?? null,
        total: 0,
        currency_code: null,
        delivery_detail: null,
        extra_charges: [],
        extra_charge_total: 0
      })),
      count: metadata?.count ?? orderSetIds.length,
      offset: metadata?.skip ?? (req.queryConfig.pagination?.skip ?? 0),
      limit: metadata?.take ?? (req.queryConfig.pagination?.take ?? orderSetIds.length)
    })
    return
  }

  const variables = {
    filters: {
      ...req.filterableFields,
      is_draft_order: false,
      customer_id: req.auth_context.actor_id,
      id: uniqueOrderIds
    },
    skip: 0,
    take: uniqueOrderIds.length,
    order: {
      created_at: 'DESC'
    }
  }

  let fields = defaultGetOrderFields;
  if (req.query.fields && req.query.fields.length) {
    fields = [...defaultGetOrderFields, ...req.queryConfig.fields];
  }

  //add cart_id to the fields
  if (!fields.includes('cart_id')) {
    fields.push('cart_id')
  }

  // Just use the configured fields
  const workflow = getOrdersListWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: fields,
      variables,
    },
  })

  const { rows } = result as {
    rows: OrderDTO[]
    metadata: {
      count: number
      skip: number
      take: number
    }
  }

  // Cast orders to our custom interface
  // const ordersList = rows as unknown as OrderWithSet[]
  //
  // // Get orders with extra charges
  // const orderWithExtraCharges = await Promise.all(
  //   ordersList.map(async (order) => {
  //     const { result: updatedExtraCharge } = await refetchOrderDetailsWithExtraChargesWorkflow.run({
  //       input: {
  //         cartId: order.order_set?.cart_id,
  //         order,
  //       },
  //     });
  //
  //     return updatedExtraCharge.order;
  //   })
  // );
  //
  // const orders = orderWithExtraCharges as unknown as OrderWithSet[]

  // Cast orders to our custom interface
  const orders = rows as unknown as OrderWithSet[]

  // Fetch extra charges at order set level (not individual order level)
  // Extra charges apply to the entire order set, so we fetch once per cart_id
  const extraChargesMap = new Map<string, ExtraCharge[]>()
  const extraChargeTotalsMap = new Map<string, number>()

  // Get unique cart IDs from order sets
  const uniqueCartIds = [
    ...new Set(
      [
        ...orderSetRecords
          .map((orderSet) => orderSet.cart_id ?? undefined)
          .filter((cartId): cartId is string => Boolean(cartId)),
        ...orders
          .map(o => o.order_set?.cart_id as string | undefined)
          .filter((cartId): cartId is string => Boolean(cartId))
      ]
    )
  ] as string[]

  // Fetch extra charges once per cart (batch processing for performance)
  await Promise.all(
    uniqueCartIds.map(async (cartId) => {
      try {
        const cartOrderExtraChargeService = req.scope.resolve<CartOrderExtraChargeModuleService>(CART_ORDER_EXTRA_CHARGE_MODULE)
        const rawCharges = await cartOrderExtraChargeService.listCartOrderExtraCharges({
          cart_id: cartId,
          status: 1 // Only active charges
        })

        // Transform raw charges to ExtraCharge type
        const extraCharges: ExtraCharge[] = rawCharges.map((charge: {
          id: string
          name: string | null
          fee_amount: number
          description: string | null
          metadata: Record<string, unknown> | null
        }) => ({
          id: charge.id,
          name: charge.name,
          amount: Number(charge.fee_amount || 0),
          description: charge.description,
          metadata: charge.metadata
        }))

        const total = extraCharges.reduce((sum, charge) => sum + charge.amount, 0)
        extraChargesMap.set(cartId, extraCharges)
        extraChargeTotalsMap.set(cartId, total)
      } catch (error) {
        console.warn(`Could not fetch extra charges for customer cart ${cartId}:`, error)
        extraChargesMap.set(cartId, [])
        extraChargeTotalsMap.set(cartId, 0)
      }
    })
  )

  // Transform thumbnails for all orders based on extracted resolution
  orders.forEach((order) => {
    transformOrderThumbnails(order, resolution)
  })

  // Fetch delivery details using a single query for all order sets
  const deliveryDetailsMap = new Map<string, OrderDeliveryDetail | null>()
  if (orderSetIds.length > 0) {
    try {
      const { data: deliveryDetails } = await query.graph({
        entity: 'order_delivery_detail',
        filters: {
          order_set_id: orderSetIds // Query all order set IDs at once
        },
        fields: ['*']
      })

      // Create a map of order_set_id to delivery detail
      if (deliveryDetails && Array.isArray(deliveryDetails)) {
        deliveryDetails.forEach((detail: OrderDeliveryDetail) => {
          if (detail.order_set_id) {
            deliveryDetailsMap.set(detail.order_set_id, detail)
          }
        })
      }
    } catch (error) {
      console.error('Error fetching delivery details:', error)
      // Set all order sets to null if query fails
      orderSetIds.forEach(orderSetId => {
        if (orderSetId) {
          deliveryDetailsMap.set(orderSetId, null)
        }
      })
    }
  }

  // Group orders by order_set_id based on paginated order set IDs
  const orderSetsGrouped = orderSetIds.reduce((acc, id) => {
    acc[id] = []
    return acc
  }, {} as Record<string, OrderWithSet[]>)


  //*populate orderSetsGrouped with orders
  orders.forEach(order => {
    const orderSetId = order.order_set?.id
    if (!orderSetId || !orderSetsGrouped[orderSetId]) {
      return
    }
    orderSetsGrouped[orderSetId].push(order)
  })

  //*Create order sets with aggregated data while preserving pagination order
  const orderSets = orderSetIds.map((orderSetId) => {
    const setOrders = orderSetsGrouped[orderSetId] ?? []
    const orderSetRecord = orderSetMap.get(orderSetId) ?? ({} as OrderSetRecord)

    // Find delivery detail for this order set
    const deliveryDetail = deliveryDetailsMap.get(orderSetId) || null

    // Extract and consolidate all items from the orders in this set
    const allItems: LineItem[] = []
    let calculatedItemsTotal = 0 // Get all items actual from order line extension table, this is used to show total amount on frontend, if any line item is returned or refunded
    let isAnyItemReturned = false // check any order item is returned or not

    setOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const itemData = item as Record<string, unknown>
          const lineItem: LineItem = {
            id: String(itemData.id ?? ""),
            title: String(itemData.title ?? "Product"),
            quantity: Number(itemData.quantity ?? 1),
            unit_price: Number(itemData.unit_price ?? 0),
            ...(typeof item === 'object' && item !== null ? item as Record<string, unknown> : {})
          }

          if ((item as any)?.order_line_item_extension?.status) {
            const item_status = (item as any).order_line_item_extension.status

            if (item_status === OrderLineItemStatus.RETURNED_REQUESTED || item_status === OrderLineItemStatus.RETURNED || item_status === OrderLineItemStatus.REFUNDED) {
              isAnyItemReturned = true
            }

            const itemTotalWithDiscount = (item as any).order_line_item_extension.item_total || 0
            calculatedItemsTotal += itemTotalWithDiscount as any
          }
          allItems.push(lineItem)
        })
      }
    })

    const cartId =
      (orderSetRecord.cart_id ?? undefined) ||
      (setOrders[0]?.order_set?.cart_id ?? '')

    // Calculate order set total: sum of all order totals + extra charges (applied once)
    const ordersTotal = setOrders.reduce((sum, order) => sum + (order.total ?? 0), 0)
    const extraChargeTotal = cartId ? (extraChargeTotalsMap.get(cartId) || 0) : 0
    const extraCharges = cartId ? (extraChargesMap.get(cartId) || []) : []
    const status = orderSetRecord.status ?? undefined

    // Get payment_status from the first order (all orders in a set should have the same payment_status)
    const firstOrder = setOrders[0] as OrderWithSet & { payment_status?: string | null }
    const payment_status = firstOrder?.payment_status || null

    // let status_message: string | null = null;
    // if (payment_status !== null) {
    //   if (payment_status === MEDUSA_PAYMENT_STATUS.NOT_PAID) {
    //     status_message = MEDUSA_PAYMENT_STATUS_DISPLAY[payment_status];
    //   }  else if (payment_status === MEDUSA_PAYMENT_STATUS.CANCELED) {
    //     status_message = MEDUSA_PAYMENT_STATUS_DISPLAY[payment_status];
    //   }
    // }

    return {
      id: orderSetId,
      ui_order_set_id: orderSetRecord.ui_order_set_id, // Fetched from database
      status: status || null,
      payment_status: payment_status,
      // status_message: status_message !== null ? status_message : (orderStatusMap[status as keyof typeof orderStatusMap] || status),
      status_message: orderStatusMap[status as keyof typeof orderStatusMap] || status,
      items: allItems,
      created_at: orderSetRecord.created_at ?? null,
      display_id: orderSetRecord.display_id ?? null,
      total: ordersTotal + extraChargeTotal,
      currency_code: setOrders[0]?.currency_code ?? null,
      delivery_detail: deliveryDetail || null,
      extra_charges: extraCharges,
      extra_charge_total: extraChargeTotal,
      metadata: orderSetRecord.metadata ?? null,
      rider_assigned_at: orderSetRecord.rider_assigned_at ?? null,
      calculated_items_total_with_extra_charge: calculatedItemsTotal + extraChargeTotal,
      is_any_item_returned: isAnyItemReturned,
    }
  })

  // Include grouped order sets in response with pagination metadata
  res.json({
    order_sets: orderSets,
    count: metadata?.count ?? orderSetIds.length,
    offset: metadata?.skip ?? (req.queryConfig.pagination?.skip ?? 0),
    limit: metadata?.take ?? (req.queryConfig.pagination?.take ?? orderSetIds.length),
  })
}
