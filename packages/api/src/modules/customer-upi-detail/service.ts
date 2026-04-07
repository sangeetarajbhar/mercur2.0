import { MedusaService } from "@medusajs/framework/utils"
import { CustomerUpiDetail } from "./models/customer-upi-detail"

class CustomerUpiModuleService extends MedusaService({
  CustomerUpiDetail,
}) {}

export default CustomerUpiModuleService
