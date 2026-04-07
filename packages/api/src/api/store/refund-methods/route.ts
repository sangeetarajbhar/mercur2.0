import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import {
  encryptForStorage,
  generateHmac,
  maskAccountHolder,
  maskAccountNumber,
  maskUpiId,
} from "../../../utils/encryption"
import {
  CUSTOMER_REFUND_METHODS_MODULE,
} from "../../../modules/customer_refund_methods"
import CustomerRefundMethodModuleService from "../../../modules/customer_refund_methods/service"
import { listCustomerRefundMethodByCustomerId } from "../../../workflows/customer-refund-method/workflows"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized")
  const service = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE)
  const data = req.validatedBody as Record<string, any>

  const payload: Record<string, any> = {
    customer_id: customerId,
    order_id: data.order_id || null,
    return_id: data.return_id || null,
    type: data.type,
    is_default: Boolean(data.is_default),
    created_by: customerId,
    updated_by: customerId,
  }

  if (data.type === "bank") {
    payload.account_number_enc = encryptForStorage(data.account_number)
    payload.account_number_hmac = generateHmac(data.account_number)
    payload.account_holder_enc = encryptForStorage(data.account_holder_name)
    payload.ifsc_code = data.ifsc_code
    payload.masked_account = maskAccountNumber(data.account_number)
    payload.masked_holder = maskAccountHolder(data.account_holder_name)
  } else {
    payload.upi_id_enc = encryptForStorage(data.upi_id)
    payload.upi_id_hmac = generateHmac(data.upi_id)
    payload.masked_upi = maskUpiId(data.upi_id)
  }

  const refund_method = await service.createCustomerRefundMethods(payload)
  res.json({ refund_method })
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized")
  const { result } = await listCustomerRefundMethodByCustomerId(req.scope).run({
    input: { customer_id: customerId, status: false },
  })
  res.json({ refund_methods: result.decryptedRefundMethods || [] })
}
