import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CUSTOMER_REFUND_METHODS_MODULE } from "../../../modules/customer_refund_methods"
import CustomerRefundMethodModuleService from "../../../modules/customer_refund_methods/service"

export const customerRefundMethodByIdStep = createStep(
  { name: "customer-refund-method-by-id-step" },
  async (input: { id: string }, { container }) => {
    const service: CustomerRefundMethodModuleService = container.resolve(
      CUSTOMER_REFUND_METHODS_MODULE
    )
    const refundMethod = await service.decryptRefundMethod(input.id)
    return new StepResponse({ refundMethod })
  }
)
