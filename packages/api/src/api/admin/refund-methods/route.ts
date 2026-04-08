import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  CUSTOMER_REFUND_METHODS_MODULE,
} from "../../../modules/customer_refund_methods"
import CustomerRefundMethodModuleService from "../../../modules/customer_refund_methods/service"
import { encryptForStorage, generateHmac, maskAccountHolder, maskAccountNumber, maskUpiId } from "../../../utils/encryption"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data, metadata } = await query.graph({
    entity: "customer_refund_method",
    fields: ["id", "customer_id", "type", "masked_account", "masked_upi", "masked_holder", "ifsc_code", "is_default", "status", "created_at", "updated_at"],
    filters: req.filterableFields || {},
    pagination: req.queryConfig?.pagination,
  })
  res.json({ refund_methods: data, count: metadata?.count || data.length })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE)
  const actorId = req.auth_context?.actor_id || "system"
  const body = req.validatedBody as Record<string, any>
  const payload: Record<string, any> = {
    customer_id: body.customer_id,
    type: body.type,
    is_default: Boolean(body.is_default),
    created_by: actorId,
    updated_by: actorId,
  }
  if (body.type === "bank") {
    payload.account_number_enc = encryptForStorage(body.account_number)
    payload.account_number_hmac = generateHmac(body.account_number)
    payload.account_holder_enc = encryptForStorage(body.account_holder_name)
    payload.ifsc_code = body.ifsc_code
    payload.masked_account = maskAccountNumber(body.account_number)
    payload.masked_holder = maskAccountHolder(body.account_holder_name)
  } else {
    payload.upi_id_enc = encryptForStorage(body.upi_id)
    payload.upi_id_hmac = generateHmac(body.upi_id)
    payload.masked_upi = maskUpiId(body.upi_id)
  }
  const refund_method = await service.createCustomerRefundMethods(payload)
  res.status(201).json({ refund_method })
}
