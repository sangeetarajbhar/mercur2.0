import {
  WorkflowResponse,
  createWorkflow,
} from '@medusajs/framework/workflows-sdk'
import { refetchCartWithExtraChargesStep } from '../steps/refetch-cart-with-extra-charges'
import { MedusaContainer } from '@medusajs/framework'
import { defaultRetentionTime } from '../../../shared/utils/constants'

/**
 * This workflow refreshes a cart and includes extra charges in the response.
 * It can be used in API endpoints to get complete cart data with extra charges.
 */
export const refreshCartWithExtraChargesWorkflow = createWorkflow({
  name: 'refresh-cart-with-extra-charges-workflow',
  store: true,
  retentionTime: defaultRetentionTime
},
  function (input: {
    cartId: string
    scope?: MedusaContainer | null
    fields: string[]
  }) {
    // Fetch cart with extra charges
    const cart = refetchCartWithExtraChargesStep(input)

    return new WorkflowResponse({ cart })
  }
)
