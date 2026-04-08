import { model } from "@medusajs/framework/utils"

export const SystemConfig = model.define("system_config", {
  id: model.id().primaryKey(),
  key: model.text(),
  value: model.text(),
})

