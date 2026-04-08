import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import {
  CUSTOMER_REFUND_METHODS_MODULE,
} from "../../../../modules/customer_refund_methods"
import CustomerRefundMethodModuleService from "../../../../modules/customer_refund_methods/service"

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized")
  const service = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE)
  const id = req.params.id
  const record = await service.retrieveCustomerRefundMethod(id)
  if (!record || (record as any).customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Refund method not found")
  }
  await service.softDeleteCustomerRefundMethods(id)
  res.json({ id, object: "refund_method", deleted: true })
}
