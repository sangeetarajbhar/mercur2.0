import { MedusaService } from "@medusajs/framework/utils"
import { customerDetails } from "./models/customer_details"

class customerDetailsModuleService extends MedusaService({
  customerDetails,
}) {

}

export default customerDetailsModuleService
