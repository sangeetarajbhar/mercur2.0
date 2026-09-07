import { MedusaService } from '@medusajs/framework/utils'
import { RefundCategory } from './models/refund-category'

class RefundCategoryModuleService extends MedusaService({
  RefundCategory
}) {
  // Custom methods can be added here if needed
}

export default RefundCategoryModuleService


