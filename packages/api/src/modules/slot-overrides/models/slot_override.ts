import { model } from "@medusajs/framework/utils"

export const SlotOverrides = model
  .define("slot_override", {
    id: model.id({ prefix: "so" }).primaryKey(),
    zone_id: model.text(),
    slot_date: model.text(),
    slot_key: model.text().nullable(),
    start_time: model.text(),
    end_time: model.text(),
    cut_off_time: model.text().nullable(),
    total_capacity: model.number(),
    remaining_capacity: model.number(),
    is_active: model.boolean().default(true),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      name: "UQ_slot_override_zone_date_time",
      on: ["zone_id", "slot_date", "start_time", "end_time"],
      where: "deleted_at IS NULL",
      unique: true,
    },
  ])

export default SlotOverrides
