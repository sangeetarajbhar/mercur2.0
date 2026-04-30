import { Module } from '@medusajs/framework/utils'
import CartModuleService from './service'

// Use the same name as the alias in medusa-config.ts
export const SELLER_CART_MODULE = 'seller_cart_pricing'

export default Module(SELLER_CART_MODULE, {
  service: CartModuleService
})