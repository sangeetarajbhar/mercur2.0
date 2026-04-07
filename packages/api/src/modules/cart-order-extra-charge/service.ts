import { MedusaService } from "@medusajs/framework/utils"
import { CartOrderExtraCharge } from "./models/cart_order_extra_charge"

class CartOrderExtraChargeModuleService extends MedusaService({
  CartOrderExtraCharge,
}) {}

export default CartOrderExtraChargeModuleService
