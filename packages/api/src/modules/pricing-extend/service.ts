import { MedusaService } from '@medusajs/framework/utils'

// import { Brand } from './models/brand'
import { ExtendPrice } from './models/extend-price'

class ExtendPriceModuleService extends MedusaService({
  ExtendPrice,
}) {

}

export default ExtendPriceModuleService

