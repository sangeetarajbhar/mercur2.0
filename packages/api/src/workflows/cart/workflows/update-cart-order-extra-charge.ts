import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import {
  UpdateCartOrderExtraChargeDTO
} from '../../../modules/cart-order-extra-charge/types/mutations'
import { updateCartOrderExtraChargeStep } from '../steps/update-cart-order-extra-charge'


export const updateCartOrderExtraChargeWorkflow = createWorkflow(
  "update-cart-order-extra-charge-workflow",
  (input: UpdateCartOrderExtraChargeDTO) => {
    const cartOrderExtraCharge = updateCartOrderExtraChargeStep(input)

    return new WorkflowResponse(cartOrderExtraCharge)
  }
)
