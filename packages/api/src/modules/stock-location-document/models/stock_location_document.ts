import { model } from "@medusajs/framework/utils"

export const StockLocationDocument = model.define("stock_location_document", {
  id: model.id().primaryKey(),
  stock_location_section_id: model.text(),
  document_type: model.text(), // PAN, GST, FSSAI
  document_number: model.text(), // PAN number, GST number, FSSAI number
  pdf_url: model.text(),
})

export default StockLocationDocument
