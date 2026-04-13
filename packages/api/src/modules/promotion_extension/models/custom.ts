import { model } from "@medusajs/framework/utils"

export enum PromotionApplicableOn {
  ALL = "all",
  APP = "app",
  WEB = "web",
}

const promotionExtension = model.define("promotion_extension", {
  id: model.id().primaryKey(),
//   custom_name: model.text(),
  cart_sub_total: model.number().default(0),
  promo_code_upper_limit: model.number().default(0),
  seller_ids: model.array().default([]),
  first_customer: model.boolean().default(false),
  for_seller: model.boolean().default(false),
  is_hidden: model.boolean().default(false),
  override_existing: model.boolean().default(true),
  applicable_on: model.enum(PromotionApplicableOn).default(PromotionApplicableOn.ALL),
})

export default promotionExtension
