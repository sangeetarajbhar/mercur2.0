import { defineLink } from "@medusajs/framework/utils"
import StockLocationSection from "../modules/stock-location-section";
import StockLocationDocument from "../modules/stock-location-document";

export default defineLink(
  StockLocationSection.linkable.stockLocationSection,
  {
    linkable: StockLocationDocument.linkable.stockLocationDocument,
    isList: true
  },
  {
    database: {
      table: "stock_loc_section_document_link",
    },
  }
)
