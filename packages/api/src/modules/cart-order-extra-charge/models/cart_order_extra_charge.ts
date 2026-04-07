import { model } from "@medusajs/framework/utils"

export const CartOrderExtraCharge = model.define("cart_order_extra_charge", {
  id: model.id({ prefix: "coec" }).primaryKey(),
  extra_charge_id: model.text(),
  extra_charge_rule_id: model.text().nullable(),
  cart_id: model.text().index(),
  order_set_id: model.text().nullable(),
  customer_id: model.text().nullable(),
  name: model.text().nullable(),
  original_amount: model.bigNumber(),
  fee_amount: model.bigNumber(),
  tax_total: model.bigNumber(),
  shipping_total: model.bigNumber(),
  discount_total: model.bigNumber(),
  total_amount: model.bigNumber(),
  description: model.text().nullable(),
  metadata: model.json().nullable(),
  status: model.number().default(1),
})
