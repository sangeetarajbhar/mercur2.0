import { Module } from '@medusajs/framework/utils'

import ExtendPriceModuleService from './service'

export const EXTEND_PRICE_MODULE = 'extend_price'

export default Module(EXTEND_PRICE_MODULE, {
  service: ExtendPriceModuleService
})

