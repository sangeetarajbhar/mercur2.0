import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import CustomerBankDetailModule from "../modules/customer-bank-detail"

export default defineLink(
  {
    linkable: CustomerModule.linkable.customer,
    isList: true,
  },
  {
    linkable: CustomerBankDetailModule.linkable.customerBankDetail,
    isList: true,
  }
)
