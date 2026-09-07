import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import {
  CUSTOMER_REFUND_METHODS_MODULE,
} from "../../../../../modules/customer_refund_methods"
import CustomerRefundMethodModuleService from "../../../../../modules/customer_refund_methods/service"

export async function PATCH(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized")
  const service = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE)
  const id = req.params.id
  const methods = await service.listCustomerRefundMethods({ customer_id: customerId, deleted_at: null })
  await Promise.all(
    methods.map((m: any) =>
      service.updateCustomerRefundMethods({ id: m.id, is_default: m.id === id, updated_by: customerId })
    )
  )
  res.json({ id, is_default: true })
}
