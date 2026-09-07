import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Complete cart immediately after payment to prevent reuse.
 * This ensures cart cannot be used for multiple payment attempts.
 * If order creation fails, compensation will reopen the cart for retry.
 */
export const completeCartImmediatelyStepId = "complete-cart-immediately"

export const completeCartImmediatelyStep = createStep(
  completeCartImmediatelyStepId,
  async ({ cart_id }: { cart_id: string }, { container }) => {
    const cartModule = container.resolve(Modules.CART)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    
    // logger.info(`[CART-COMPLETE] Completing cart ${cart_id} immediately after payment authorization`)
    
    // Mark cart as completed to prevent reuse during order creation
    await cartModule.updateCarts({
      id: cart_id
    }, {
      completed_at: new Date()
    })
    
    logger.debug(`[CART-COMPLETE] Cart ${cart_id} completed successfully - protected from reuse`)
    
    return new StepResponse({ cart_id })
  }
)

