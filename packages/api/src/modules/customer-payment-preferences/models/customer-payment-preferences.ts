import { model } from "@medusajs/framework/utils"

export const CustomerPaymentPreferences = model
  .define("customer_payment_preferences", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    type: model.text(),
    type_id: model.text(),
    status: model.text(),
    metadata: model.json().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
    deleted_by: model.text().nullable(),
  })
  .indexes([
    { on: ["customer_id"] },
    { on: ["status"] },
    { on: ["type_id"] },
  ])
