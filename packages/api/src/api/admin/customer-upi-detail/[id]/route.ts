import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'

import { decryptFromStorage } from '../../../../modules/customer_refund_methods/utils/encryption'

const BANK_VERIFICATION_FIELDS = [
  'id',
  'customer_refund_method_id',
  'customer_id',
  'gateway_id',
  'reference_id',
  'status',
  'bank_account_status',
  'utr',
  'fav_id',
  'fund_account_id',
  'contact_id',
  'registered_name',
  'failure_reason',
  'metadata',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at'
]

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const userId = req.auth_context?.actor_id
  if (!userId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, 'Unauthorized user')
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = req.params.id

  const { data: customerUpiDetails } = await query.graph({
    entity: 'customer_upi_detail',
    fields: [...req.queryConfig.fields],
    filters: { id },
    pagination: req.queryConfig.pagination
  })

  const record = customerUpiDetails?.[0]
  if (!record) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Customer UPI detail not found'
    )
  }

  const { upi_id_enc, ...rest } = record as Record<string, unknown> & {
    upi_id_enc?: string
  }
  delete (rest as Record<string, unknown>).upi_id_hmac
  const customerUpiDetail: Record<string, unknown> = { ...rest }

  if (upi_id_enc) {
    try {
      customerUpiDetail.upi_id = decryptFromStorage(upi_id_enc)
    } catch {
      customerUpiDetail.upi_id = upi_id_enc
    }
  } else {
    customerUpiDetail.upi_id = upi_id_enc
  }

  let customerBankAccountVerification: Record<string, unknown> | null = null
  const verificationId = record.customer_bank_account_verification_id as
    | string
    | undefined
  if (verificationId) {
    const { data: verifications } = await query.graph({
      entity: 'customer_bank_account_verification',
      fields: BANK_VERIFICATION_FIELDS,
      filters: { id: verificationId },
      pagination: { skip: 0, take: 1 }
    })
    const verification = verifications?.[0]
    if (verification) {
      const verificationRest = { ...(verification as Record<string, unknown>) }
      delete verificationRest.raw_gateway_response_enc
      customerBankAccountVerification = verification
    }
  }

  res.json({
    customer_upi_detail: customerUpiDetail,
    customer_bank_account_verification: customerBankAccountVerification
  })
}
