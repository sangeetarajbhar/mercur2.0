import { defineLink } from "@medusajs/framework/utils"
import StockLocationModule from "@medusajs/medusa/stock-location";
import StockLocationSection from "../modules/stock-location-section";

export default defineLink(
  StockLocationModule.linkable.stockLocation,
  {
    linkable: StockLocationSection.linkable.stockLocationSection,
  },
  {
    database: {
      table: "stock_location_stock_location_section",
    },
  }
)


