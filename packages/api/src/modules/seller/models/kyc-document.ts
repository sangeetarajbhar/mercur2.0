import { model } from '@medusajs/framework/utils'
import  Seller from './seller'

export const KycDocument = model.define('kyc_document', {
  id: model.id({ prefix: 'kyc' }).primaryKey(),

  kyc_type: model.enum([
    'PAN',
    'TAN',
    'NOODLE_LETTER',
    'SIGNATURE',
    'COI',
    'INVOICE_GUIDELINE',
    'CANCELLED_CHEQUE',
    'AGREEMENT',
    'TRADEMARK',
    'SIN_NUMBER',
    'GST_CERTIFICATE',
    'MSME_CERTIFICATE',
    'OTHERS'
  ]),

  value: model.text(),
  file_url: model.text(),

  seller: model.belongsTo(() => Seller, { mappedBy: 'kyc_documents' })
})
