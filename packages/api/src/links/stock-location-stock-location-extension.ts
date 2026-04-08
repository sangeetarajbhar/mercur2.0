import { defineLink } from "@medusajs/framework/utils"
import StockLocationExtensionModule from "../modules/stock-location-extension"
import StockLocationModule from "@medusajs/medusa/stock-location";

export default defineLink(
  StockLocationModule.linkable.stockLocation,
  {
    linkable: StockLocationExtensionModule.linkable.stockLocationExtension,
  },
  {
    database: {
      table: "stock_location_stock_location_extension",
    },
  }
)
