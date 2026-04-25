// src/workflows/merge-cart-into-active.ts
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
// OLD IMPORTS (commented out):
// import sellerSellerCartLineItemLink from "../../../links/seller-cart-line-item"
// import { addToCartWorkflow } from "./add-to-cart"
// NEW IMPORT:
import { updateLineItemCartIdStep } from "../steps"


type MergeCartInput = {
  source_cart_id: string  // cart to copy items from
  target_cart_id: string | null // customer's active cart
  transfer_customer?: { cart_id: string; customer_id: string } | null // optional
}


export const mergeCartIntoActiveWorkflow = createWorkflow(
  "merge-cart-into-active",
  (input: import("@medusajs/framework/workflows-sdk").WorkflowData<MergeCartInput>) => {

    const { data: sourceCart } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "items.*"],
      filters: { id: input.source_cart_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "source-cart-query" })
    
    // Collect source line item ids
    const lineItemIds = transform({ sourceCart: sourceCart as any }, ({ sourceCart }) => {
      const sc = sourceCart[0] as { items?: Array<{ id: string }> }
      const items = Array.isArray(sc?.items) ? sc.items : []
      return items.map((it) => it.id)
    })

    updateLineItemCartIdStep({
      line_item_ids: lineItemIds,
      source_cart_id: input.source_cart_id as string,
      target_cart_id: input.target_cart_id as string
    })
    
    // Get the final updated cart
    const { data: updatedCart } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*"],
      filters: { id: input.target_cart_id as string },
    }).config({ name: "refetch-cart" })

    const mergedCart = transform({ updatedCart: updatedCart as any }, ({ updatedCart }: { updatedCart: any[] }) => {
      return updatedCart[0] ?? null
    })

    return new WorkflowResponse({ cart: mergedCart })
  }
)