import { Module } from '@medusajs/framework/utils'

import CartDeliveryDetailService from './service'

export const CART_DELIVERY_DETAIL_MODULE = 'cart_delivery_detail'

export default Module(CART_DELIVERY_DETAIL_MODULE, {
  service: CartDeliveryDetailService
})
