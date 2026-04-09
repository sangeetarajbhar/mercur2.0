import { Module } from "@medusajs/framework/utils"
import ReturnRefundTypeLinkModuleService from "./service"

export const RETURN_REFUND_TYPE_LINK_MODULE = "return_refund_type_link"

export default Module(RETURN_REFUND_TYPE_LINK_MODULE, {
  service: ReturnRefundTypeLinkModuleService,
})

