import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaError } from '@medusajs/framework/utils'
import { Knex } from 'knex'
import { defaultStoreOrderFields } from '../../../query-config'
import { orderStatusMap } from '../../../utils'
import { getItemSize, getReturnNoOfDays } from '../../../../../utils/common-order-set-detail-response'
import { OrderLineItemStatus } from '../../../../../../utils/constants/order-statuses'
import { getOrderAdditionalDetailsWorkflow } from '../../../../../../workflows/order-details/workflows'
import { getLatestByCreatedAt } from '../../../../../admin/seller-orders/utils'
import { COD_PAYMENT_PROVIDER, PaymentMethod } from '../../../../../../utils/constants/payments'
import { transformOrderThumbnails } from '../../../../../utils/middlewares'

// Find return data for this specific item
interface ReturnData {
return_id: string
return_status: string
return_created_at: Date | string
return_updated_at: Date | string
quantity: number
reason: unknown
note: string | null
}

interface ReturnDetailsWithAmount {
  item_id: string,
  unit_price: number,
  discount_total: number,
  return_total: number
}

/**
 * @oas [get] /store/orders/{order_id}/items/{item_id}
 * operationId: "StoreGetOrderItemDetail"
 * summary: "Get Order Item Detail with Return Data"
 * description: "Retrieves detailed information about a specific order line item, including return data if available. The order must belong to the authenticated customer."
 * x-authenticated: true
 * parameters:
 *   - name: order_id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The ID of the Order
 *   - name: item_id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The ID of the Order Line Item
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             item:
 *               type: object
 *               description: The order line item details with return data included
 *   "404":
 *     description: Order or item not found
 *   "403":
 *     description: Order does not belong to the authenticated customer
 * tags:
 *   - Store
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id: order_id, item_id: item_id } = req.params
  const customerId = req.auth_context?.actor_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      'Authentication required'
    )
  }

  const variables = {
    filters: {
      is_draft_order: false,
      customer_id: customerId,
      id: order_id
    },
  }

  // Get order details using direct query to verify ownership and get items
  const { data: orders } = await query.graph({
    entity: 'order',
    fields: defaultStoreOrderFields,
    filters: variables.filters,
  })

  if (!orders || orders.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id: ${order_id} was not found or does not belong to you`
    )
  }

  const order = orders[0]

  // Find the specific item in the order
  const items = order.items || []
  if (items && items.length > 0) {
    const resolution = '3x'
    transformOrderThumbnails({ items: items }, resolution)
  }

  const item = items.find((item: { id: string }) => item.id === item_id)

  if (!item) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Item with id: ${item_id} was not found in order ${order_id}`
    )
  }

  let return_details_with_amount: ReturnDetailsWithAmount | null = null
  let deliveryDetail: unknown = null
  let payment_method: unknown = null

  const order_set = order.order_set

  const orderDetailsWorkflow = getOrderAdditionalDetailsWorkflow(req.scope)
  const { result: orderDetails } = await orderDetailsWorkflow.run({
    input: {
      order_id: '', // We only need order_set_id for delivery details
      order_set_id: order_set.id
    }
  })

  if (orderDetails?.delivery_detail) {
    deliveryDetail = orderDetails.delivery_detail
  }

  const latestPayment = getLatestByCreatedAt((order_set.payment_collection as any).payments as any[])
  if (latestPayment) {
    payment_method = latestPayment.provider_id === COD_PAYMENT_PROVIDER ? PaymentMethod.COD : PaymentMethod.PREPAID
  }

  if ((item as any)?.order_line_item_extension?.status) {
    const item_status = (item as any).order_line_item_extension.status
    item.status_message = orderStatusMap[item_status as keyof typeof orderStatusMap] || item_status
    item.size = getItemSize((item as any).variant.options)
    item.return_no_of_days = getReturnNoOfDays((item as any).order_line_item_extension?.return_no_of_days,
      (item as any).order_line_item_extension?.created_at)

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
    }
  }

  item.return_details_with_amount = return_details_with_amount;

  // Use direct Knex queries for better performance instead of query.graph
  // Fetch return data for this specific item
  const returnRows = await knex('return as r')
    .select(
      'r.id',
      'r.order_id',
      'r.status',
      'r.created_at',
      'r.updated_at',
      'ri.id as return_item_id',
      'ri.item_id as line_item_id',
      'ri.quantity',
      'ri.reason_id',
      'ri.note'
    )
    .leftJoin('return_item as ri', function() {
      this.on('ri.return_id', '=', 'r.id')
        .andOnNull('ri.deleted_at')
    })
    .where('r.order_id', order_id)
    .where('ri.item_id', item_id)
    .whereNull('r.deleted_at')
    .whereNotNull('ri.item_id')
    .limit(1) // Only need the first matching return item

  let returnData: ReturnData | null = null

  if (returnRows && returnRows.length > 0) {
    const row = returnRows[0]

    // Fetch reason if reason_id exists
    let reason: unknown = null
    if (row.reason_id) {
      const reasons = await knex('return_reason')
        .select('id', 'label', 'value', 'description')
        .where('id', row.reason_id)
        .whereNull('deleted_at')
        .first()

      reason = reasons || null
    }

    returnData = {
      return_id: row.id,
      return_status: row.status,
      return_created_at: row.created_at,
      return_updated_at: row.updated_at,
      quantity: row.quantity,
      reason: reason,
      note: row.note
    }
  }

  // Return item with return_data included
  res.json({
    order_set: {
      ...order_set,
      order_id: order.id,
      shipping_address: order.shipping_address,
      payment_method: payment_method,
      delivery_detail: deliveryDetail,
      item: {
        ...item,
        returns: returnData
      }
    },
  })
}
