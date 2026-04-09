import { MedusaService } from "@medusajs/framework/utils"
import { StockLocationDocument } from "./models/stock_location_document"


class StockLocationDocumentModuleService extends MedusaService({
  StockLocationDocument,
}) {

}

export default StockLocationDocumentModuleService
