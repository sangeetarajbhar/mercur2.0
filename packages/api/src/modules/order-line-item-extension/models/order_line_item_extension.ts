import { model } from "@medusajs/framework/utils"
import { OrderLineItemStatus } from "../../../utils/constants/order-statuses"

export const OrderLineItemExtension = model.define("order_line_item_extension", {
  id: model.id({ prefix: 'ordliext' }).primaryKey(),
  order_line_item_id: model.text(),
  returnable_flag: model.boolean().default(false),
  return_no_of_days: model.number().default(0),
  return_end_date: model.dateTime().nullable(),

  // Shipment tracking
  shipment_id: model.text().nullable(), // Links to fullfillment table's id

  // Order status fields
  status: model.enum(OrderLineItemStatus).default(OrderLineItemStatus.PAYMENT_PENDING),
  accepted_at: model.dateTime().nullable(),
  rejected_at: model.dateTime().nullable(),
  cancelled_at: model.dateTime().nullable(),
  packed_at: model.dateTime().nullable(),
  shipped_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),

  // Reason fields for rejection/cancellation
  reason: model.text().nullable(),
  reason_code: model.text().nullable(),

  item_total: model.bigNumber().nullable(),
  item_discount_total: model.bigNumber().nullable(),
})
