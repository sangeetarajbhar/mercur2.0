import { model } from '@medusajs/framework/utils'

export const RefundCategory = model.define('refund_category', {
  id: model.id().primaryKey(),
  name: model.enum(['logistics', 'customer', 'seller']),
  description: model.text().nullable(),
})

