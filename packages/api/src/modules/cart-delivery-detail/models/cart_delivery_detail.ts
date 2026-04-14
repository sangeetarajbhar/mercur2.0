import { model } from '@medusajs/framework/utils'

export const CartDeliveryDetail = model.define('cart_delivery_detail', {
  id: model.id({ prefix: 'cdeli' }).primaryKey(),
  cart_id: model.text(),
  delivery_type: model.text(),
  delivery_date: model.dateTime(),
  start_time: model.text(),
  end_time: model.text(),
  slot_id: model.text().nullable(), // For slotted delivery, stores the slot_override id
})

export default CartDeliveryDetail