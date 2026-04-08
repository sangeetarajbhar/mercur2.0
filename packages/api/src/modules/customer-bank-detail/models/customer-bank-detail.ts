import { model } from "@medusajs/framework/utils"

export const CustomerBankDetail = model
  .define("customer_bank_detail", {
    id: model.id().primaryKey(),
    verified_by: model.text(),
    customer_bank_account_verification_id: model.text().nullable(),
    account_number_enc: model.text(),
    account_number_hmac: model.text(),
    account_holder_enc: model.text(),
    ifsc_code: model.text(),
    masked_account: model.text(),
    masked_holder: model.text(),
    bank_name: model.text().nullable(),
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
      on: ["account_number_hmac"],
    },
  ])
