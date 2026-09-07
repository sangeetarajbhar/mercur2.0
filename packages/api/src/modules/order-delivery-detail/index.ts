import { Module } from '@medusajs/framework/utils'

import OrderDeliveryDetailService from './service'

export const ORDER_DELIVERY_DETAIL_MODULE = 'order_delivery_detail'

export default Module(ORDER_DELIVERY_DETAIL_MODULE, {
  service: OrderDeliveryDetailService
})