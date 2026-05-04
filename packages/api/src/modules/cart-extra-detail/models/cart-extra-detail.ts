import { model } from "@medusajs/framework/utils"

export const CartExtraDetail = model.define("cart_extra_detail", {
  id: model.id().primaryKey(),
  shipping_type: model.enum(['single', 'multi']).default('single'),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})

export default CartExtraDetail