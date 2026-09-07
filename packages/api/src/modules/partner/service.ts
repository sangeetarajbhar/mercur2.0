import { MedusaService } from "@medusajs/framework/utils"
import { Partner } from "./models/partner"

class PartnerModuleService extends MedusaService({
  Partner,
}) {}

export default PartnerModuleService
