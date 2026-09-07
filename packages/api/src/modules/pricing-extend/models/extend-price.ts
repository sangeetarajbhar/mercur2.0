import { model } from '@medusajs/framework/utils'

export const ExtendPrice = model.define('extend_price', {
  id: model.id().primaryKey(),
  percentage_discount: model.number(),
})

