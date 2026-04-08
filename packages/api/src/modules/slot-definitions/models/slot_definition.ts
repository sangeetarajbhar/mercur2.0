import { model } from "@medusajs/framework/utils"

export const SlotDefinitions = model
  .define("slot_definition", {
    id: model.id({ prefix: "slot" }).primaryKey(),
    zone_id: model.text(),
    slot_key: model.text(),
    start_time: model.text(),
    end_time: model.text(),
    default_capacity: model.number(),
    is_active: model.boolean().default(true),
    cut_off_time: model.text(),
    metadata: model.json().default({}),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      name: "UQ_slot_definition_zone_time",
      on: ["zone_id", "start_time", "end_time"],
      where: "deleted_at IS NULL",
      unique: true,
    },
  ])

export default SlotDefinitions
