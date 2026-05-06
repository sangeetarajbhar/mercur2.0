import {defineLink} from '@medusajs/framework/utils'
import MarketplaceModule from '../modules/marketplace'
import SellerModule from "@mercurjs/core/modules/seller";

export default defineLink(SellerModule.linkable.orderGroup,
  {
    linkable: MarketplaceModule.linkable.orderSet,
    isList: true
  },
  {
    database: {
      table: 'order_group_order_set',
    }
  }
)
