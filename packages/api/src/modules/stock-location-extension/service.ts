import { MedusaService } from "@medusajs/framework/utils"
import { StockLocationExtension } from "./models/stock_location_extension"


class StockLocationExtensionModuleService extends MedusaService({
  StockLocationExtension,
}) {

}

export default StockLocationExtensionModuleService
