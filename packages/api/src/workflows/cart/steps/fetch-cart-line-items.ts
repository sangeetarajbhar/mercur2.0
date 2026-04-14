import {  StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { CartLineItemDTO } from "@medusajs/framework/types"
// import { Knex } from "knex"
import {
  ContainerRegistrationKeys
} from '@medusajs/framework/utils'

export const fetchCartLineItemsStep = createStep(
  "fetch-cart-line-items",
  async (input: { cart_id: string }, { container }) => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    // const knex = container.resolve<Knex>("knex")

    // First get the basic line items
    const basicItems = await knex("cart_line_item")
      .select(["id", "variant_id", "unit_price", "quantity", "metadata"])
      .where("cart_id", input.cart_id)
      .whereNull("deleted_at")

    // Then get adjustments for each item
    const itemsWithAdjustments = await Promise.all(
      basicItems.map(async (item) => {
        const adjustments = await knex("cart_line_item_adjustment")
          .select(["id", "promotion_id", "code", "amount"])
          .where("item_id", item.id)
          .whereNull("deleted_at")
        
        return {
          ...item,
          adjustments: adjustments
        }
      })
    )

    return new StepResponse(itemsWithAdjustments);
    // return { items }
  }
)
