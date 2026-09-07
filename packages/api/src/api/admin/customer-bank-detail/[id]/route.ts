import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { decryptFromStorage } from "../../../../utils/encryption"

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

  const { account_number_enc, account_holder_enc, ...rest } = record as Record<string, any>
  const customer_bank_detail = {
    ...rest,
    account_number: account_number_enc ? decryptFromStorage(account_number_enc) : null,
    account_holder_name: account_holder_enc ? decryptFromStorage(account_holder_enc) : null,
  }

  let customer_bank_account_verification: Record<string, unknown> | null = null
  if (record.customer_bank_account_verification_id) {
    const { data: verifications } = await query.graph({
      entity: "customer_bank_account_verification",
      fields: BANK_VERIFICATION_FIELDS,
      filters: { id: record.customer_bank_account_verification_id },
      pagination: { skip: 0, take: 1 },
    })
    customer_bank_account_verification = verifications?.[0] ?? null
  }

  res.json({ customer_bank_detail, customer_bank_account_verification })
}
