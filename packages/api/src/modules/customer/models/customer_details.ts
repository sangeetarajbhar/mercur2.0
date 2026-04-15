import { model } from '@medusajs/framework/utils'

export const customerDetails = model.define('customerDetails', {
  id: model.id().primaryKey(),
  dob: model.dateTime().nullable(),
  gender: model.text().nullable()
})
