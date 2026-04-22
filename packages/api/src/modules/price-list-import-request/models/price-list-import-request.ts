import { model } from "@medusajs/framework/utils"

export const PriceListImportRequest = model.define("price_list_import_request", {
  id: model.id({ prefix: "plreq" }).primaryKey(),
  type: model.text().default("price_list"),
  data: model.json(),
  submitter_id: model.text(),
  seller_id: model.text(),
  file_name: model.text(),
  transaction_id: model.text().nullable(),
  reviewer_id: model.text().nullable(),
  reviewer_note: model.text().nullable(),
  status: model
    .enum(["draft", "pending", "accepted", "rejected"])
    .default("pending"),
})
