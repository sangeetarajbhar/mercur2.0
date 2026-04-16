import { getLatestByCreatedAt } from '../admin/seller-orders/utils';
import { LineItem, Order, OrderSet } from '../store/order-set/[id]/route';
import { orderStatusDateMap, orderStatusDetailsMap, orderStatusList, orderStatusMap } from '../store/orders/utils';
import { transformOrderThumbnails } from '../utils/middlewares';
import { getOrderAdditionalDetailsWorkflow } from '../../workflows/order-details/workflows';
import { MedusaRequest } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { OrderLineItemStatus } from '../../utils/constants/order-statuses'
import { MEDUSA_PAYMENT_STATUS, MEDUSA_PAYMENT_STATUS_DISPLAY } from '#/utils/constants/payments'
import { aggregateItemsMrpAndSellerDiscount } from '../../shared/utils/order-line-item-mrp'

export const getItemSize = (options: any[]) => {
  const sizeOption = (options || []).find(
    o => o?.option?.title?.toLowerCase() === 'size'
  );
  return sizeOption?.value ?? null;
}

const getOrdersPromocode = (items: LineItem[]) => {
  if (!items || items.length === 0) {
    return null
  }

  for (const item of items) {
    if(!(item.adjustments as any[]).length || (item.adjustments as any[]).length === 0) {
      continue
    }
    for (const adjustment of item.adjustments as any[]) {
      if(adjustment.code  !== null && adjustment.code !== undefined && adjustment.code !== '') {
        return adjustment.code
      }
    }
  }

  return null
}

interface ReturnDetailsWithAmount {
  item_id: string,
  unit_price: number,
  discount_total: number,
  return_total: number
}


export async function commonOrderSetDetailResponse(id: string, orderSet: OrderSet, req: MedusaRequest) {
  let deliveryDetail: unknown = null
  try {
    const orderDetailsWorkflow = getOrderAdditionalDetailsWorkflow(req.scope)
    const { result: orderDetails } = await orderDetailsWorkflow.run({
      input: {
        order_id: '', // We only need order_set_id for delivery details
        order_set_id: id
      }
    })
    deliveryDetail = orderDetails.delivery_detail
  } catch (error) {
    console.error('Error fetching order delivery detail:', error)
  }

  // Extract and consolidate all items from all orders
  const allItems: LineItem[] = []
  const ordersWithoutItems: Omit<Order, 'items'>[] = []

  let shippingAddress: any | null = null

  let itemsSubTotal = 0 // Get all items actual amount excluding promotion applied
  let itemsDiscountTotal = 0 // Get all items discount total

  let calculatedItemsTotal = 0 // Get all items actual from order line extension table, this is used to show total amount on frontend, if any line item is returned or refunded
  let calculatedItemsDiscountTotal = 0 // Get all items actual from order line extension table, this is used to show total amount on frontend, if any line item is returned or refunded
  let itemTotalWithoutDiscount = 0 // Get all items actual from order line extension table, this is used to show item total amount without discount on frontend, if any line item is returned or refunded
  let isAnyItemReturned = false // check any order item is returned or not
  // let payment_status_message: string | null = null;
  if (orderSet.orders && Array.isArray(orderSet.orders)) {
    shippingAddress = (orderSet.orders[0] as any)?.shipping_address || null

    // if (orderSet.status !== 'PAYMENT_PENDING') {
    //   if (orderSet.payment_status === MEDUSA_PAYMENT_STATUS.NOT_PAID) {
    //     payment_status_message =
    //       MEDUSA_PAYMENT_STATUS_DISPLAY[orderSet.payment_status]
    //   } else if (orderSet.payment_status === MEDUSA_PAYMENT_STATUS.CANCELED) {
    //     payment_status_message =
    //       MEDUSA_PAYMENT_STATUS_DISPLAY[orderSet.payment_status]
    //   }
    // }

    // Collect all items from all orders
    orderSet.orders.forEach((order) => {
      itemsSubTotal += order.subtotal as any
      itemsDiscountTotal += order.discount_total as any
      if (order.items && Array.isArray(order.items)) {
        // Push each item individually to maintain type safety
        order.items.forEach((item) => {
          let return_details_with_amount: ReturnDetailsWithAmount | null = null

          if ((item as any)?.order_line_item_extension?.status) {
            const item_status = (item as any).order_line_item_extension.status
            // on item level also, change status message as per payment status not_paid or canceled
            // item.status_message = payment_status_message !== null ? payment_status_message : (orderStatusMap[item_status as keyof typeof orderStatusMap] || item_status)
            item.status_message = orderStatusMap[item_status as keyof typeof orderStatusMap] || item_status
            item.order_item_payment_status = orderSet.payment_status
            item.status_date =
              (item as any).order_line_item_extension[
                orderStatusDateMap[
                  item_status as keyof typeof orderStatusDateMap
                ]
              ] || null
            item.size = getItemSize((item as any).variant.options)
            item.return_no_of_days = getReturnNoOfDays((item as any).order_line_item_extension?.return_no_of_days,
              (item as any).order_line_item_extension?.created_at)

            // below condition will work only in case of returned or refunded to show return details with amount on frontend
            if (item_status === OrderLineItemStatus.RETURNED_REQUESTED || item_status === OrderLineItemStatus.RETURNED || item_status === OrderLineItemStatus.REFUNDED) {
              const adjustment_total = Array.isArray(item.adjustments)
                ? item.adjustments.reduce((sum, adj) => sum + (adj.total ?? 0), 0)
                : 0;
              return_details_with_amount = {
                item_id: item.id,
                unit_price: item.unit_price,
                discount_total: adjustment_total,
                return_total: item.unit_price - adjustment_total
              }

              isAnyItemReturned = true
            }

            const itemTotalWithDiscount = (item as any).order_line_item_extension.item_total || 0
            const itemDiscountTotal = (item as any).order_line_item_extension.item_discount_total || 0
            calculatedItemsTotal += itemTotalWithDiscount as any
            calculatedItemsDiscountTotal += itemDiscountTotal as any
            itemTotalWithoutDiscount += itemTotalWithDiscount + itemDiscountTotal
          }
          // Attach return_details_with_amount (null or object)
          item.return_details_with_amount = return_details_with_amount;
          allItems.push(item)
        })
        // Create a copy of the order without items
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { items: itemsToRemove, ...orderWithoutItems } = order
        ordersWithoutItems.push(orderWithoutItems)
      } else {
        ordersWithoutItems.push(order)
      }
      delete (order as any).items
    })
  }

  // Extract resolution from query parameter
  const resolution = (req.query?.resolution || req.query?.thumbnail_resolution || '3x') as string

  // console.log("orderSet.status", orderSet.status)
  //*map status as per the order status map
  let order_status = orderSet.status
  if (order_status === OrderLineItemStatus.PACKED) {
    if (orderSet[orderStatusDateMap['RIDER_ASSIGNED']] !== null) {
      order_status = orderStatusMap['RIDER_ASSIGNED']
    }
  }

  orderSet.status_message = orderStatusMap[order_status as keyof typeof orderStatusMap] || order_status
  // orderSet.status_message = payment_status_message !== null ? payment_status_message : orderStatusMap[order_status as keyof typeof orderStatusMap]
  orderSet.status_date = orderSet[orderStatusDateMap[order_status as keyof typeof orderStatusDateMap]] || null
  orderSet.status_details = orderStatusDetailsMap[order_status as keyof typeof orderStatusDetailsMap] || order_status

  const latestPayment = getLatestByCreatedAt((orderSet.payment_collection as any).payments as any[])
  if (latestPayment) {
    orderSet.payment_method = latestPayment.provider_id === 'pp_system_default' ? 'COD' : 'PREPAID'
  }

  // Fetch metadata and rider_assigned_at directly from database
  // Note: Query graph doesn't return these fields for order_set entity, so we use direct DB query
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const dbResult = await knex('order_set')
    .select('metadata', 'rider_assigned_at')
    .where({ id })
    .first()

  const riderDetails = dbResult?.metadata && typeof dbResult.metadata === 'object'
      ? dbResult.metadata
      : null
  const riderAssignedAt = dbResult?.rider_assigned_at || null

  const { items_mrp_total, items_seller_discount_total } =
    aggregateItemsMrpAndSellerDiscount(allItems)

  const finalOrderSet = {
    ...orderSet,
    items_sub_total: itemsSubTotal,
    items_discount_total: itemsDiscountTotal,
    /** Sum of (MRP per unit × qty); MRP = `compare_at_unit_price` or fallback `unit_price`. */
    items_mrp_total,
    /** MRP − Σ(`unit_price` × `quantity`); list/seller discount before coupon/promo line discounts. */
    items_seller_discount_total,
    promocode: getOrdersPromocode(allItems),
    items: allItems, // Add consolidated items at the order set level
    // orders: ordersWithoutItems, // Replace orders with versions without items
    delivery_detail: deliveryDetail,
    shipping_address: (orderSet as any).cart?.shipping_address || null, // Get shipping address from cart
    order_status_list: (orderStatusList as string[]) || [],
    rider_details: riderDetails,
    rider_assigned_at: riderAssignedAt,
    calculated_items_total_with_extra_charge: calculatedItemsTotal + (orderSet as any).extra_charge_total as number,
    calculated_items_discount_total: calculatedItemsDiscountTotal,
    calculated_items_total_without_discount: itemTotalWithoutDiscount,
    is_any_item_returned: isAnyItemReturned
  }

  // Transform thumbnails for consolidated items at order-set level
  if (allItems && allItems.length > 0) {
    transformOrderThumbnails({ items: allItems }, resolution)
  }

  // Transform thumbnails for items in nested orders (if they still have items)
  if (finalOrderSet.orders && Array.isArray(finalOrderSet.orders)) {
    finalOrderSet.orders.forEach((order: any) => {
      if (order.items) {
        transformOrderThumbnails(order, resolution)
      }
    })
  }

  return finalOrderSet
}

export const getReturnNoOfDays = (returnNoOfDays: number, createdAt: string): number | null => {
  if (!returnNoOfDays) return null;

  const created = new Date(createdAt);
  if (isNaN(created.getTime())) {
    return null;
  }

  const now = new Date();

  const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime() / 86400000;
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000;

  const diffDays = Math.floor(nowDay - createdDay);

  return Math.max(0, returnNoOfDays - diffDays);
};
