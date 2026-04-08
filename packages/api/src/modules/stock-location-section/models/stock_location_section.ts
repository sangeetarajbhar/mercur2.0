import { model } from "@medusajs/framework/utils"

export const StockLocationSection = model.define("stock_location_section", {
  id: model.id().primaryKey(),
  stock_location_id: model.text(),
  address_type: model.text(),
  partner_wh_code: model.text(),
  lead_time: model.text(),
  managed_by: model.text(),
}).checks([
  (columns) =>
    `((${columns.address_type} != '3') OR ` +
    `(${columns.partner_wh_code} IS NOT NULL AND ` +
    `${columns.lead_time} IS NOT NULL AND ` +
    `${columns.managed_by} IS NOT NULL))`
])

// if address_type is 3, then partner_wh_code, lead_time, managed_by should be not NULL
// if address_type is not 3, then partner_wh_code, lead_time, managed_by can be NULL
export default StockLocationSection
