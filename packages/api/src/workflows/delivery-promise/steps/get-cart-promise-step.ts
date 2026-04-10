import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getCartPromise, CartPromiseResponse } from "../workflows/get-cart-promise"

export interface GetCartPromiseStepInput {
  cart: any
  postal_code?: string
  lat?: string
  long?: string
}

/**
 * Step to get delivery promise for cart items
 * This step calculates delivery promises based on cart line items and postal code
 * 
 * @param input - Cart data with postal code
 * @returns CartPromiseResponse with delivery details
 */
export const getCartPromiseStep = createStep(
  "get-cart-promise-step",
  async (input: GetCartPromiseStepInput, { container }) => {
    const { cart, postal_code } = input

    // Call the getCartPromise function
    const deliveryPromiseResult: CartPromiseResponse = await getCartPromise({
      scope: container,
      cart,
      postal_code
    })

    return new StepResponse(deliveryPromiseResult)
  }
)

