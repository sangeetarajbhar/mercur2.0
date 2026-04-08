import { MedusaService } from "@medusajs/framework/utils"
import { ReturnRefundTypeLink } from "./models/return-refund-type-link"

class ReturnRefundTypeLinkModuleService extends MedusaService({
  ReturnRefundTypeLink,
}) {}

export default ReturnRefundTypeLinkModuleService

