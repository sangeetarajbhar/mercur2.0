import { model } from "@medusajs/framework/utils"

export const Zones = model.define("zone", {
  id: model.id({ prefix: "zone" }).primaryKey(),
  location_id: model.text(),
  name: model.text(),
  description: model.text().nullable(),
  postcodes: model.json(),
  is_active: model.boolean().default(true),
  start_time: model.text().nullable(),
  end_time: model.text().nullable(),
  metadata: model.json().default({}),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})

export default Zones
