import { model } from "@medusajs/framework/utils"

export const customerRefundMethod = model
  .define("customer_refund_method", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    order_id: model.text().nullable(),
    return_id: model.text().nullable(),
    type: model.enum(["bank", "upi"]),
    account_number_enc: model.text().nullable(),
    account_number_hmac: model.text().nullable(),
    account_holder_enc: model.text().nullable(),
    ifsc_code: model.text().nullable(),
    upi_id_enc: model.text().nullable(),
    upi_id_hmac: model.text().nullable(),
    masked_account: model.text().nullable(),
    masked_upi: model.text().nullable(),
    masked_holder: model.text().nullable(),
    is_default: model.boolean().default(false),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
    is_account_verified: model.boolean().default(false),
    status: model.boolean().default(false),
  })
  .indexes([
    { name: "customer_refund_method_customer_id_idx", on: ["customer_id"] },
    {
      name: "customer_refund_method_customer_default_idx",
      on: ["customer_id", "is_default"],
      where: "deleted_at IS NULL",
    },
    {
      name: "customer_refund_method_account_hmac_idx",
      on: ["account_number_hmac", "status"],
      unique: true,
      where: "account_number_hmac IS NOT NULL AND deleted_at IS NULL",
    },
    {
      name: "customer_refund_method_upi_hmac_idx",
      on: ["upi_id_hmac", "status"],
      unique: true,
      where: "upi_id_hmac IS NOT NULL AND deleted_at IS NULL",
    },
  ])
