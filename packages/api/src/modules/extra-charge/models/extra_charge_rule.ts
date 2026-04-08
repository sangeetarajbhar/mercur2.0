import { model } from "@medusajs/framework/utils"

export const ExtraChargeRule = model.define("extra_charge_rule", {
  id: model.id({ prefix: "ecr" }).primaryKey(),
  extra_charge_id: model.text(),
  name: model.text().searchable(),
  description: model.text().nullable(),
  attribute: model.text(),
  operator: model.enum(["eq", "in", "gt", "lt", "gte", "lte"]),
  values: model.array(),
  min_cart_total: model.bigNumber().nullable(),
  max_cart_total: model.bigNumber().nullable(),
  min_quantity: model.number().nullable(),
  max_quantity: model.number().nullable(),
  priority: model.number().default(0),
  status: model.enum(["active", "inactive"]).default("active"),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
  created_by: model.text(),
  updated_by: model.text(),
})
