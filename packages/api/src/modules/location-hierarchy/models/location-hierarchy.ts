import { model } from "@medusajs/framework/utils"

export const LocationHierarchy = model.define("location_hierarchy", {
  id: model.id().primaryKey(),
  parent_location_id: model.text(),
  child_location_id: model.text(),
})
