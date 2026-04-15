import { model } from "@medusajs/framework/utils"

export const ProductConfiguration = model.define("product_configuration", {
  id: model.id().primaryKey(),
  returnable_days: model.text(),
  is_returnable: model.boolean().default(false),
  is_exchangeable: model.boolean().default(false),
  is_try_and_buy: model.boolean().default(true),
  // exchangeable_days: model.number(),
})