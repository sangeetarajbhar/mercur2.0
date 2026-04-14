import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const updateCartTimestampStep = createStep(
  "update-cart-timestamp",
  async (input: { cart_id: string }, { container }) => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    await knex("cart")
      .where({ id: input.cart_id })
      .update({ updated_at: new Date() })

    return new StepResponse(null)
  }
)
