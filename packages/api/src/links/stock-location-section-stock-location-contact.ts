import { defineLink } from "@medusajs/framework/utils"
import StockLocationSection from "../modules/stock-location-section";
import StockLocationContact from "../modules/stock-location-contact";

export default defineLink(
  StockLocationSection.linkable.stockLocationSection,
  {
    linkable: StockLocationContact.linkable.stockLocationContact,
  },
  {
    database: {
      table: "stock_loc_section_contact_link",
    },
  }
)

