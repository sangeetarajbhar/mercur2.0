import { model } from "@medusajs/framework/utils"

export const CustomerUpiDetail = model
  .define("customer_upi_detail", {
    id: model.id().primaryKey(),
    verified_by: model.text(),
    customer_bank_account_verification_id: model.text().nullable(),
    upi_id_enc: model.text(),
    upi_id_hmac: model.text(),
    masked_upi: model.text(),
    status: model.text().default("inactive"),
    metadata: model.json().nullable(),
    created_by: model.text(),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      on: ["customer_bank_account_verification_id"],
    },
    {
      on: ["status"],
    },
    {
      on: ["upi_id_hmac"],
    },
  ])
