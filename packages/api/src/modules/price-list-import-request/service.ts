import { MedusaService } from "@medusajs/framework/utils"
import { PriceListImportRequest } from "./models"

class PriceListImportRequestModuleService extends MedusaService({
  PriceListImportRequest,
}) {}

export default PriceListImportRequestModuleService
