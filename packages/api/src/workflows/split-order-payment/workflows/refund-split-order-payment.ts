import {
  WorkflowResponse,
  createWorkflow,
  transform
} from '@medusajs/framework/workflows-sdk'

import  { RefundSplitOrderPaymentsDTO } from '../../../modules/split-order-payment/types/mutations'

import { updateSplitOrderPaymentsStep } from '../steps'
import { validateRefundSplitOrderPaymentStep } from '../steps/validate-refund-split-order-payment'
import { partialPaymentRefundWorkflow } from './partial-payment-refund'

export const refundSplitOrderPaymentWorkflow = createWorkflow(
  {
    name: 'refund-split-order-payment'
  },
  function (input: RefundSplitOrderPaymentsDTO) {
    const updatePayload = validateRefundSplitOrderPaymentStep(input)
    partialPaymentRefundWorkflow.runAsStep({ input })
    const splitOrderPayment = updateSplitOrderPaymentsStep(
      transform(updatePayload, (updatePayload) => [updatePayload])
    )
    return new WorkflowResponse(splitOrderPayment)
  }
)
