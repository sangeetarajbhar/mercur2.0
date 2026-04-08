import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { CreateCartOrderExtraChargeDTO } from '../../../modules/cart-order-extra-charge/types/mutations'
import { createCartOrderExtraChargeStep } from '../steps/create-cart-order-extra-charge'


export const createCartOrderExtraChargeWorkflow = createWorkflow(
  "create-cart-order-extra-charge-workflow",
  (input: CreateCartOrderExtraChargeDTO) => {
    const cartOrderExtraCharge = createCartOrderExtraChargeStep(input)

    return new WorkflowResponse(cartOrderExtraCharge)
  }
)
