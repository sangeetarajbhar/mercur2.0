import {
  WorkflowResponse,
  createWorkflow
} from '@medusajs/framework/workflows-sdk'

import { listCustomerRefundMethodByCustomerIdNewMappingStep } from '../steps/list-customer-refund-method-by-customer-id-new-mapping-step'

export type listCustomerRefundMethodByCustomerIdNewMappingInput = {
  customer_id: string
}

export const listCustomerRefundMethodByCustomerIdNewMapping = createWorkflow({
  name: 'list-customer-refund-method-by-customer-id-new-mapping-workflow',
},
  function (input: listCustomerRefundMethodByCustomerIdNewMappingInput) {
    const refund_methods =
      listCustomerRefundMethodByCustomerIdNewMappingStep(input)

    return new WorkflowResponse(refund_methods)
  }
)
