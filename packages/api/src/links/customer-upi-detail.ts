import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import CustomerUpiDetailModule from "../modules/customer-upi-detail"

export default defineLink(
  {
    linkable: CustomerModule.linkable.customer,
    isList: true,
  },
  {
    linkable: CustomerUpiDetailModule.linkable.customerUpiDetail,
    isList: true,
  }
)
