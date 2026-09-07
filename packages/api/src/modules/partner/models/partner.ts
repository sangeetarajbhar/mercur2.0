import { model } from "@medusajs/framework/utils"

export const Partner = model.define("partner", {
  id: model.id().primaryKey(),
  name: model.text(),
  status: model.text(),
  metadata: model.text().nullable(),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})
