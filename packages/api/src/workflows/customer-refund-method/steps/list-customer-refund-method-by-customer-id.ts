import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CUSTOMER_REFUND_METHODS_MODULE } from "../../../modules/customer_refund_methods"
import CustomerRefundMethodModuleService from "../../../modules/customer_refund_methods/service"

export const listCustomerRefundMethodByCustomerIdStep = createStep(
  { name: "list-customer-refund-method-by-customer-id-step" },
  async (input: { customer_id: string; status: boolean }, { container }) => {
    const service: CustomerRefundMethodModuleService = container.resolve(
      CUSTOMER_REFUND_METHODS_MODULE
    )
    const decryptedRefundMethods = await service.getCustomerRefundMethodsDecrypted(
      input.customer_id,
      input.status
    )
    return new StepResponse({ decryptedRefundMethods })
  }
)
