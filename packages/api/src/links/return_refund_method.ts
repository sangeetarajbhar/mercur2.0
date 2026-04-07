import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import CustomerRefundMethod from "../modules/customer_refund_methods"

export default defineLink(
  {
    linkable: OrderModule.linkable.return,
    isList: true,
  },
  {
    linkable: CustomerRefundMethod.linkable.customerRefundMethod,
    isList: true,
  },
  {
    database: {
      table: "return_refund_method",
    },
  }
)
