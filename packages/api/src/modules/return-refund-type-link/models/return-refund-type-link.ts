import { model } from "@medusajs/framework/utils"

// @TODO: This table is a global return_refund_type_link table where one return id will be mapped with type id from (customer_upi_detail or customer_bank_detail) table
export const ReturnRefundTypeLink = model
  .define("return_refund_type_link", {
    id: model.id().primaryKey(),
    return_id: model.text(), // return_id
    type: model.text(), // upi or bank
    type_id: model.text(),
    customer_id: model.text(),
    status: model.text().default("inactive"),
    metadata: model.json().nullable(),
    created_by: model.text(),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      on: ["return_id", "status"],
    },
    {
      on: ["type_id"],
    },
    {
      on: ["customer_id"],
    },
  ])

