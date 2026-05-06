import { defineLink } from "@medusajs/framework/utils"
import OrderModule from '@medusajs/medusa/order'
import OrderLineItemExtension from '../modules/order-line-item-extension'

export default defineLink(
  OrderModule.linkable.orderLineItem,
  {
    linkable: OrderLineItemExtension.linkable.orderLineItemExtension,
  },
  {
    database: {
      table: "order_line_item_order_line_item_extension",
    },
  }
)
