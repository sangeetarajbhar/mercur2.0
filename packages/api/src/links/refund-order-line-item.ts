import PaymentModule from "@medusajs/medusa/payment"
import OrderModule from "@medusajs/medusa/order"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  PaymentModule.linkable.refund,
  {
    linkable: OrderModule.linkable.orderLineItem,
    isList: true, // Allow one refund to be linked to multiple order line items
  },
  {
    database: {
      table: "refund_order_line_item",
    },
  }
)