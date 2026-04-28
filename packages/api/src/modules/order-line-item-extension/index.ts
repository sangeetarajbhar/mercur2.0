import { Module } from "@medusajs/framework/utils"
import OrderLineItemExtensionModuleService from './service'

export const ORDER_LINE_ITEM_EXTENSION_MODULE = "order_line_item_extension"

export default Module(ORDER_LINE_ITEM_EXTENSION_MODULE, {
  service: OrderLineItemExtensionModuleService,
})
