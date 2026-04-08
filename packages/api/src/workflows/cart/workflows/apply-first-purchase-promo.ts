import { createWorkflow, when, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { updateCartPromotionsStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { FIRST_PURCHASE_PROMOTION_CODE } from "../../../constants"
import { PromotionActions } from "@medusajs/framework/utils"
import { isFirstCustomer } from "../../../shared/utils/check-first-customer"

type WorkflowInput = {
  cart_id: string
  promotion_code?: string
}

// Step to check if customer is a first-time customer (excluding draft, pending, canceled, and deleted orders)
const checkIsFirstCustomerStep = createStep(
  "check-is-first-customer",
  async ({ customer_id }: { customer_id: string }, { container }) => {
    const isFirstTimeCustomer = await isFirstCustomer(customer_id, container)
    return new StepResponse({ isFirstCustomer: isFirstTimeCustomer })
  }
)

export const applyFirstPurchasePromoWorkflow = createWorkflow(
  "apply-first-purchase-promo",
  (input: WorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["promotions.*", "customer.*" , "customer.orders.*"],
      filters: {
        id: input.cart_id,
      },
    })

    const { data: promotions } = useQueryGraphStep({
      entity: "promotion",
      fields: ["code"],
      filters: {
        code: input.promotion_code
      }
    }).config({ name: "retrieve-promotions" })

    // Check if customer is first-time customer properly
    const customerCheck = checkIsFirstCustomerStep({
      customer_id: carts[0].customer?.id
    })

    when({ 
      carts,
      promotions,
      customerCheck
    }, (data) => {
      return data.promotions.length > 0 && 
        !data.carts[0].promotions?.some((promo) => promo?.id === data.promotions[0].id) && 
        data.carts[0].customer !== null && 
        data.customerCheck.isFirstCustomer === true
    })
    .then(() => {
      updateCartPromotionsStep({
        id: carts[0].id,
        promo_codes: [promotions[0].code!],
        action: PromotionActions.ADD,
      })
    })

    // retrieve updated cart
    const { data: updatedCarts } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "promotions.*"],
      filters: {
        id: input.cart_id,
      },
    }).config({ name: "retrieve-updated-cart" })

    return new WorkflowResponse(updatedCarts[0])
  }
)