import { model } from "@medusajs/framework/utils"

export const StockLocationExtension = model.define("stock_location_extension", {
  id: model.id().primaryKey(),
  location_type: model.text(),
  address_type: model.text(),
  latitude: model.float().nullable(),
  longitude: model.float().nullable(),
  partner_id: model.text(),
  return_location_id: model.text(),
  status: model.text(),
  servisibility_status: model.text(),
  start_time: model.text(),
  end_time: model.text(),
  is_delay: model.boolean().default(false),
  delay_value: model.text().nullable(),
  delay_message: model.text().nullable(),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})
