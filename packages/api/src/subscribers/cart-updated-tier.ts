import {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { addTierPromotionToCartWorkflow } from "../workflows/tier/workflows/add-tier-promotion-to-cart"

export default async function cartUpdatedTierHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    await addTierPromotionToCartWorkflow(container).run({
      input: {
        cart_id: data.id,
      },
    })
  } catch (error) {
    console.error(
      `[TIER] Error applying tier promotion to cart ${data.id}:`,
      error instanceof Error ? error.message : String(error)
    )
  }
}

export const config: SubscriberConfig = {
  event: ["cart.created"],
  context: {
    subscriberId: "cart-updated-tier-handler",
  },
}

