import { model } from '@medusajs/framework/utils'
import { OrderLineItemStatus } from "../constants/order-statuses"

// const OrderSet = model.define('order_set', {
export const OrderSet = model.define('order_set', {
  id: model.id({ prefix: 'ordset' }).primaryKey(),
  display_id: model.number().nullable(),
  ui_order_set_id: model.number().nullable(),
  sales_channel_id: model.text(),
  cart_id: model.text(),
  customer_id: model.text().nullable(),
  payment_collection_id: model.text(),
  status: model.enum(OrderLineItemStatus).default(OrderLineItemStatus.PAYMENT_PENDING),
  rider_assigned_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
  accepted_at: model.dateTime().nullable(),
  rejected_at: model.dateTime().nullable(),
  cancelled_at: model.dateTime().nullable(),
  packed_at: model.dateTime().nullable(),
  shipped_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
  tracking_id: model.text().nullable(),
  courier_code: model.text().nullable(),
})

export default OrderSet