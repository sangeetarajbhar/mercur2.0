import { MedusaService } from '@medusajs/framework/utils'

import OrderSet from './models/order-set'

class MarketplaceModuleService extends MedusaService({
  OrderSet
}) {}

export default MarketplaceModuleService
