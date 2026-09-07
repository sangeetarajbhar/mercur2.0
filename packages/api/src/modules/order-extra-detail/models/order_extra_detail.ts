import { model } from "@medusajs/framework/utils"

export const OrderExtraDetail = model.define("order_extra_detail", {
  id: model.id({ prefix: 'ordext' }).primaryKey(),
  order_id: model.text(),
  stock_location_id: model.text(),
  marketplace_order_id: model.text().unique(),
  packed_by: model.dateTime().nullable(), // Timestamp when the order is packed
  confirmed_at: model.dateTime().nullable(), // Timestamp when the order is confirmed
  tracking_id: model.text().nullable(),
  courier_code: model.text().nullable(),
  invoice_id: model.text().nullable(),
}).indexes([
  { on: ["order_id"] },
  { on: ["stock_location_id"] },
])
