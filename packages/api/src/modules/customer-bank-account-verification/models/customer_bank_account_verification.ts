import { model } from "@medusajs/framework/utils"

export const customerBankAccountVerification = model.define(
  "customer_bank_account_verification",
  {
    id: model.id().primaryKey(),
    customer_refund_method_id: model.text().nullable(),
    customer_id: model.text().nullable(),
    gateway_id: model.text().nullable(),
    reference_id: model.text().nullable(),
    status: model.enum(["created", "completed", "failed"]),
    bank_account_status: model.text().nullable(),
    utr: model.text().nullable(),
    fav_id: model.text().nullable(),
    fund_account_id: model.text().nullable(),
    contact_id: model.text().nullable(),
    registered_name: model.text().nullable(),
    failure_reason: model.text().nullable(),
    raw_gateway_response_enc: model.text().nullable(),
    metadata: model.json().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  }
)
