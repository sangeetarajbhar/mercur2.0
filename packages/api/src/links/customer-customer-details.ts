import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import CustomerDetailModule from "../modules/customer"

export default defineLink(
  CustomerModule.linkable.customer,
  CustomerDetailModule.linkable.customerDetails
)