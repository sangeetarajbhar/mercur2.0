import { MedusaService } from "@medusajs/framework/utils"
import { OrderLineItemExtension } from "./models/order_line_item_extension"


class OrderLineItemExtensionModuleService extends MedusaService({
  OrderLineItemExtension,
}) {

}

export default OrderLineItemExtensionModuleService
