import { model } from "@medusajs/framework/utils"

export const RatingFeedback = model
  .define("rating_feedback", {
    id: model.id({ prefix: "rtfb" }).primaryKey(),

    session_id: model.text(),

    status: model.enum(["active", "archived"]).default("active"),

    customer_id: model.text().nullable(),
    order_id: model.text().nullable(),

    rating: model.number(),

    option_id: model.text().nullable(),

    custom_text: model.text().nullable(),

    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })

export default RatingFeedback

