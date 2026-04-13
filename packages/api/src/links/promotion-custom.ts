import PromotionExtensionModule from "../modules/promotion_extension"
import PromotionModule from "@medusajs/medusa/promotion"
import { defineLink } from '@medusajs/framework/utils'

export default defineLink(
    PromotionModule.linkable.promotion,
  {
    linkable: PromotionExtensionModule.linkable.promotionExtension,
    isList: true,
     alias: {
      primary: "promotion",              
      foreign: "promotion_extension", 
    },
  },
  {
    database: {
      table: "promotion_promotion_extension",
    },
  }
)