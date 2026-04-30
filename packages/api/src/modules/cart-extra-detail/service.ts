import { MedusaService } from "@medusajs/framework/utils"
import { CartExtraDetail } from "./models/cart-extra-detail"

class CartExtraDetailModuleService extends MedusaService({
  CartExtraDetail,
}) {

}

export default CartExtraDetailModuleService