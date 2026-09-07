import { MedusaService } from "@medusajs/framework/utils"
import { CustomerBankDetail } from "./models/customer-bank-detail"

class CustomerBankModuleService extends MedusaService({
  CustomerBankDetail,
}) {}

export default CustomerBankModuleService
