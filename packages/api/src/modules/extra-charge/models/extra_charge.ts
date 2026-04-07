import { model } from "@medusajs/framework/utils"

export const ExtraCharge = model.define("extra_charge", {
  id: model.id({ prefix: "extra_charge" }).primaryKey(),
  name: model.text().searchable(),
  amount: model.bigNumber(),
  type: model.text().nullable(),
  status: model.enum(["active", "inactive"]).default("active"),
  created_by: model.text(),
  updated_by: model.text(),
})
