import { MedusaService } from "@medusajs/framework/utils"
import { OrderExtraDetail } from "./models/order_extra_detail"

class OrderExtraDetailModuleService extends MedusaService({
  OrderExtraDetail,
}) {

}

export default OrderExtraDetailModuleService
