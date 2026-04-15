import ProductConfigurationModule from "../modules/product-configuration"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true,
  },
  ProductConfigurationModule.linkable.productConfiguration,
  {
    database: {
      table: "product_product_configuration",
    },
  }
)