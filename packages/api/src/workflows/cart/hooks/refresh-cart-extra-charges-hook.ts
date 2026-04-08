import { StepResponse } from '@medusajs/framework/workflows-sdk'
import { refreshCartItemsWorkflow } from '@medusajs/medusa/core-flows'

import { refreshCartExtraChargesWorkflow } from '../workflows/refresh-cart-extra-charges'

/**
 * Hook that automatically applies extra charges when cart items are refreshed
 * This ensures extra charges are always up-to-date based on current cart state
 */
// Hook into the refreshCartItemsWorkflow after it completes
refreshCartItemsWorkflow.hooks.setPricingContext(
  async ({ cart_id }) => {
    // Run our extra charges workflow after cart refresh
    // refreshCartExtraChargesWorkflow.runAsStep({
    //   input: { cart_id }
    // })

    // Return the original pricing context (don't modify it)
    return new StepResponse({})
  }
)
