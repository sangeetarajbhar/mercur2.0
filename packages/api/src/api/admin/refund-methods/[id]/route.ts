import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import {
  CUSTOMER_REFUND_METHODS_MODULE,
} from "../../../../modules/customer_refund_methods"
import CustomerRefundMethodModuleService from "../../../../modules/customer_refund_methods/service"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE)
  const refund_method = await service.retrieveCustomerRefundMethod(req.params.id)
  res.json({ refund_method })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE)
  await service.softDeleteCustomerRefundMethods(req.params.id)
  res.json({ id: req.params.id, object: "refund_method", deleted: true })
}
