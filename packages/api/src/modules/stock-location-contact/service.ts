import { MedusaService } from "@medusajs/framework/utils"
import { StockLocationContact } from "./models/stock_location_contact"


class StockLocationContactModuleService extends MedusaService({
  StockLocationContact,
}) {

}

export default StockLocationContactModuleService
