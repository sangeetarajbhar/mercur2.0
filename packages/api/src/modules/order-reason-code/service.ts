import { MedusaService } from "@medusajs/framework/utils"
import { OrderRejectCancelReasonCode } from "./models/order-reject-cancel-reason-code"

class OrderReasonCodeModuleService extends MedusaService({
  OrderRejectCancelReasonCode,
}) {}

export default OrderReasonCodeModuleService
