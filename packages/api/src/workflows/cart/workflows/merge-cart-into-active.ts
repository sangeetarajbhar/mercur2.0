// src/workflows/merge-cart-into-active.ts
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
// OLD IMPORTS (commented out):
// import sellerSellerCartLineItemLink from "../../../links/seller-cart-line-item"
// import { addToCartWorkflow } from "./add-to-cart"
// NEW IMPORT:
import { updateLineItemCartIdStep } from "../steps/update-line-item-cart-id"


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
    
    // ============================================================================
    // OLD LOGIC (COMMENTED OUT - DO NOT REMOVE)
    // ============================================================================
    
    // Fetch seller link rows with embedded line item
    // const { data: linkRows } = useQueryGraphStep({
    //   entity: sellerSellerCartLineItemLink.entryPoint,
    //   fields: ["line_item_id", "seller_id", "line_item.*"],
    //   filters: { line_item_id: lineItemIds },
    // }).config({ name: "seller-cart-line-links" })
    
    // Process items to add
    // type LinkRow = { 
    //   seller_id?: string; 
    //   line_item?: { 
    //     variant_id: string; 
    //     quantity: number; 
    //     metadata?: Record<string, unknown> 
    //   } 
    // }
    
    // const itemsToAdd = transform({ linkRows }, ({ linkRows }) => {
    //   const rows = (Array.isArray(linkRows) ? linkRows : []) as LinkRow[]
    //   return rows
    //     .filter((r) => !!r.line_item)
    //     .map((r) => {
    //       const li = r.line_item as NonNullable<LinkRow["line_item"]>
    //       const baseMeta = li.metadata && typeof li.metadata === "object" ? li.metadata : {}
    //       const metadata = r.seller_id ? { ...baseMeta, seller_id: r.seller_id } : baseMeta
    //       return {
    //         variant_id: li.variant_id,
    //         quantity: li.quantity,
    //         metadata,
    //       }
    //     })
    // })
    
    // Add items to target cart
    // addToCartWorkflow.runAsStep({
    //   input: {
    //     cart_id: input.target_cart_id as string,
    //     items: itemsToAdd,
    //   },
    // })
    
    // Get the final updated cart
    const { data: updatedCart  } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*"],
      filters: { id: input.target_cart_id as any },
    }).config({ name: "refetch-cart" })
    
    return new WorkflowResponse({ cart: updatedCart[0] as any })
  }
)