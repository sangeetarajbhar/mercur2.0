import { model } from "@medusajs/framework/utils"

export const StockLocationContact = model.define("stock_location_contact", {
  id: model.id().primaryKey(),
  stock_location_section_id: model.text(),
  first_name: model.text(),
  last_name: model.text(),
  email: model.text(),
  phone_number: model.text(),
})

export default StockLocationContact
