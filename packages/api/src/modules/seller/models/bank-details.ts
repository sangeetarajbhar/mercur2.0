import { model } from '@medusajs/framework/utils'
import { Seller } from './seller'

export const BankDetail = model.define('bank_detail', {
  id: model.id({ prefix: 'bank' }).primaryKey(),

  account_number: model.text(),
  ifsc_code: model.text(),
  bank_name: model.text(),
  branch_name: model.text(),

  account_type: model.enum(['SAVINGS', 'CURRENT']),
  entity_type: model.enum(['PRIVATE_LIMITED', 'PROPRIETORSHIP', 'PARTNERSHIP']),

  account_verified: model.boolean(),

  seller: model.belongsTo(() => Seller, { mappedBy: 'bank_detail' })
})
