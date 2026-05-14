import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { decryptFromStorage } from "../../../../modules/customer_refund_methods/utils/encryption"

const BANK_VERIFICATION_FIELDS = [
  "id",
  "customer_refund_method_id",
  "customer_id",
  "gateway_id",
  "reference_id",
  "status",
  "bank_account_status",
  "utr",
  "fav_id",
  "fund_account_id",
  "contact_id",
  "registered_name",
  "failure_reason",
  "metadata",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const userId = req.auth_context?.actor_id
  if (!userId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized user")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = req.params.id
  const { data } = await query.graph({
    entity: "customer_bank_detail",
    fields: [...req.queryConfig.fields],
    filters: { id },
    pagination: req.queryConfig.pagination,
  })

  const record = data?.[0]
  if (!record) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer bank detail not found")
  }

  const { account_number_enc, account_holder_enc, ...rest } = record as Record<string, unknown> & {
    account_number_enc?: string
    account_holder_enc?: string
  }

  const customer_bank_detail: Record<string, unknown> = { ...rest }

  if (account_number_enc && typeof account_number_enc === "string") {
    try {
      customer_bank_detail.account_number = decryptFromStorage(account_number_enc)
    } catch {
      customer_bank_detail.account_number = account_number_enc
    }
  } else {
    customer_bank_detail.account_number = account_number_enc
  }

  if (account_holder_enc && typeof account_holder_enc === "string") {
    try {
      customer_bank_detail.account_holder_name = decryptFromStorage(account_holder_enc)
    } catch {
      customer_bank_detail.account_holder_name = account_holder_enc
    }
  } else {
    customer_bank_detail.account_holder_name = account_holder_enc
  }

  let customer_bank_account_verification: Record<string, unknown> | null = null
  const verificationId = record.customer_bank_account_verification_id as string | undefined
  if (verificationId) {
    const { data: verifications } = await query.graph({
      entity: "customer_bank_account_verification",
      fields: BANK_VERIFICATION_FIELDS,
      filters: { id: verificationId },
      pagination: { skip: 0, take: 1 },
    })

    const verification = verifications?.[0]
    if (verification) {
      const verificationRest = { ...(verification as Record<string, unknown>) }
      delete verificationRest.raw_gateway_response_enc
      customer_bank_account_verification = verificationRest
    }
  }

  res.json({ customer_bank_detail, customer_bank_account_verification })
}
