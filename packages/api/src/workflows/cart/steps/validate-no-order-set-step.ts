import { MedusaError } from "@medusajs/framework/utils"
import { createStep, transform, WorkflowData } from "@medusajs/framework/workflows-sdk"
import { useRemoteQueryStep } from "@medusajs/medusa/core-flows"

const validateNoOrderSetStep = createStep(
  "validate-no-order-set-for-promo-update",
  ({ hasOrderSet }: { hasOrderSet: boolean }) => {
    if (hasOrderSet) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Cannot update promotions after order set exists for this cart."
      )
    }
  }
)

export const validateNoOrderSetForCartStep = ({
  cartId,
}: {
  cartId: WorkflowData<string>
}) => {
  const existingOrderSets = useRemoteQueryStep({
    entry_point: "order_set",
    fields: ["id"],
    variables: {
      filters: {
        cart_id: cartId,
      },
    },
    list: true,
  }).config({ name: "check-order-set-before-promo-update" })

  const hasOrderSet = transform({ existingOrderSets }, ({ existingOrderSets }) => {
    return Array.isArray(existingOrderSets) && existingOrderSets.length > 0
  })

  validateNoOrderSetStep({ hasOrderSet })
}
