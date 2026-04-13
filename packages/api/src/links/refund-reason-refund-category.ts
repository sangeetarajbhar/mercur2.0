import { defineLink } from '@medusajs/framework/utils'
import PaymentModule from '@medusajs/medusa/payment'

import RefundCategoryModule from '../modules/refund-category'

export default defineLink(
  {
    linkable: PaymentModule.linkable.refundReason,
    isList: true
  },
  RefundCategoryModule.linkable.refundCategory
)


