import { model } from '@medusajs/framework/utils'
import  Seller  from './seller'

export const CompanySpoc = model.define('company_spoc', {
  id: model.id({ prefix: 'spoc' }).primaryKey(),

  first_name: model.text(),
  last_name: model.text(),
  email: model.text(),
  phone: model.text(),

  type: model.enum(['Primary', 'Secondary']),

  seller: model.belongsTo(() => Seller, { mappedBy: 'company_spocs' })
})
