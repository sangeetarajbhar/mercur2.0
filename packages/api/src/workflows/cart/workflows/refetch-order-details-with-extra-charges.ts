import {
  WorkflowResponse,
  createWorkflow,
} from '@medusajs/framework/workflows-sdk'
import {
  refetchOrderDetailsWithExtraChargesStep
} from '../steps/refetch-order-details-with-extra-charges'
import { defaultRetentionTime } from '../../../shared/utils/constants'

/**
 * This workflow refreshes an order and includes extra charges in the response.
 */
export const refetchOrderDetailsWithExtraChargesWorkflow = createWorkflow({
  name: 'refetch-order-details-with-extra-charges-workflow',
  store: true,
  retentionTime: defaultRetentionTime
},
  function (input: {
    cartId: string
    order: any
  }) {
    // Fetch order with extra charges
    const order = refetchOrderDetailsWithExtraChargesStep(input)

    return new WorkflowResponse({ order })
  }
)
