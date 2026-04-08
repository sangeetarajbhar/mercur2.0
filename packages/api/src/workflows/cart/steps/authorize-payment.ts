import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { authorizePaymentSessionStep } from '@medusajs/medusa/core-flows'

/**
 * Input type for authorizing payment
 */
type AuthorizePaymentInput = {
  cart: any
  paymentSessions: any
}

/**
 * Output type for payment authorization
 */
type AuthorizePaymentOutput = {
  payment: any
}

/**
 * Step to authorize payment
 */
export const authorizePaymentStep = createStep(
  'authorize-payment',
  async (input: AuthorizePaymentInput): Promise<StepResponse<AuthorizePaymentOutput>> => {
    const { cart, paymentSessions } = input

    const payment = authorizePaymentSessionStep({
      id: paymentSessions[0].id,
      context: { cart_id: cart.id }
    })

    return new StepResponse({ payment })
  }
)

