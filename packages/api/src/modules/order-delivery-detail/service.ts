import { MedusaService } from "@medusajs/framework/utils"
import { OrderDeliveryDetail } from "./models/order_delivery_detail"

class OrderDeliveryDetailModuleService extends MedusaService({
  OrderDeliveryDetail
}) {
  // You can add custom methods here if needed
}

export default OrderDeliveryDetailModuleService