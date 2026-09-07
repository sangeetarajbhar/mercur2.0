import { Module } from '@medusajs/framework/utils'
import RefundCategoryModuleService from './service'

export const REFUND_CATEGORY_MODULE = 'refundCategory'

export default Module(REFUND_CATEGORY_MODULE, {
  service: RefundCategoryModuleService
})


