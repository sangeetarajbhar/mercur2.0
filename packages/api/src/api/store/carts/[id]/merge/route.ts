import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { transferCartCustomerWorkflow } from "@medusajs/medusa/core-flows"
import { mergeCartIntoActiveWorkflow } from "../../../../../workflows/cart/workflows"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id: source_cart_id } = req.params
    const customerId = req?.auth_context?.actor_id || null

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Customer must be logged in."
      })
    }

    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const customer = await customerModuleService.retrieveCustomer(customerId)

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found."
      })
    }
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: sourceCartCompleted } = await query.graph({
        entity: "cart",
        fields: ["id"],
        filters: {
          id: source_cart_id,
          deleted_at: null,
          completed_at: null,
          customer_id: null,
        },
        pagination: { take: 1, order: { created_at: "desc" } },
    })

    if(sourceCartCompleted.length === 0){
      return res.status(404).json({
        success: false,
        message: "Source cart not found or completed."
      })
    }

    // Find customer's active cart
    const { data: customerCarts } = await query.graph({
      entity: "cart",
      fields: ["id"],
      filters: {
        customer_id: customer.id,
        deleted_at: null,
        completed_at: null,
      },
      pagination: { take: 1, order: { created_at: "desc" } },
    })

    const target_cart_id = customerCarts?.[0]?.id ?? null

    // If target cart doesn't exist, transfer ownership of source cart to customer
    if (!target_cart_id) {
      await transferCartCustomerWorkflow(req.scope).run({
        input: {
          id: source_cart_id,
          customer_id: customer.id,
        },
      })

      const { data: transferredCart } = await query.graph({
        entity: "cart",
        fields: ["*", "items.*"],
        filters: { id: source_cart_id },
      })

      return res.json({
        success: true,
        cart: transferredCart[0],
        action: "transferred_ownership"
      })
    } else {
      // If target cart exists, use the merge workflow
      const { result } = await mergeCartIntoActiveWorkflow(req.scope).run({
        input: {
          source_cart_id,
          target_cart_id,
          transfer_customer: null,
        },
      })

      return res.json({
        success: true,
        cart: result.cart,
        action: "merged_items"
      })
    }
  } catch (error) {
    console.error("Cart merge error:", error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while merging carts",
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
