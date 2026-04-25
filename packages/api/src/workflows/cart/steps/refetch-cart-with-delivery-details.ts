import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { refetchCartWithDeliveryDetails } from "../../../api/store/v2/carts/helpers"

export interface RefetchCartWithDeliveryDetailsInput {
  cart_id: string
  fields: string[]
}

/**
 * Step to refetch cart with delivery details
 * This step retrieves the latest cart data including delivery type, date, time, and slot information
 * 
 * @param input - Cart ID and fields to retrieve
 * @returns Cart object with delivery details
 */
export const refetchCartWithDeliveryDetailsStep = createStep(
  "refetch-cart-with-delivery-details",
  async (input: RefetchCartWithDeliveryDetailsInput, { container }) => {
    const { cart_id, fields } = input

    // Refetch cart with delivery details
    const cart = await refetchCartWithDeliveryDetails(
      cart_id,
      container,
      fields
    )

    return new StepResponse(cart)
  }
)

