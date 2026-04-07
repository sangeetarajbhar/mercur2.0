import { MedusaService } from "@medusajs/framework/utils"
import { ExtraCharge, ExtraChargeRule } from "./models"

class ExtraChargeService extends MedusaService({
  ExtraCharge,
  ExtraChargeRule,
}) {}

export default ExtraChargeService
