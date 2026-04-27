import { model } from "@medusajs/framework/utils"

export const RatingConfig = model
  .define("rating_config", {
    id: model.id({ prefix: "rtcfg" }).primaryKey(),

    status: model.enum(["active", "inactive", "draft"]).default("active"),

    option_text: model.text().nullable(),
    
    sort_order: model.number().default(0),

    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })

export default RatingConfig

