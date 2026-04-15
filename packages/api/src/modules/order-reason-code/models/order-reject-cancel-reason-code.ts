import { model } from "@medusajs/framework/utils"

export const OrderRejectCancelReasonCode = model.define(
  "order_reject_cancel_reason_code",
  {
    id: model.id().primaryKey(),
    reason_code: model.text(),
    reason: model.text(),
  }
)
