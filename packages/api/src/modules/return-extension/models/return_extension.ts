import { model } from "@medusajs/framework/utils"

export const ReturnExtension = model.define("return_extension", {
  id: model.id({ prefix: "reext" }).primaryKey(),
  return_id: model.text(),

  /** Latest / primary workflow status label for this return extension row */
  status: model.text().default("OUT_FOR_PICKUP"),

  out_for_pickup_at: model.dateTime().nullable(),
})
