import { model } from "@medusajs/framework/utils"

export const InstantPromises = model.define("instant_promise", {
  id: model.id({ prefix: "ip" }).primaryKey(),
  zone_id: model.text(),
  promise_text: model.text(),
  promise_minutes: model.number(),
  pickup_lead_minutes: model.number().default(0),
  return_lead_minutes: model.number().default(0),
  is_active: model.boolean().default(true),
  metadata: model.json().default({}),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})

export default InstantPromises
