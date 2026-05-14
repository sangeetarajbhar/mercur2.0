import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { BankAccountType } from "../../../../../utils/constants/bank_account_verification"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const userId = req.auth_context?.actor_id

  if (!userId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized user")
  }

  const bankDetailId = req.params.id

  if (!bankDetailId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Bank detail id is required")
  }

  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: preferences = [], metadata } = await query.graph({
    entity: "customer_payment_preferences",
    fields: ["id", "customer_id"],
    filters: {
      type_id: bankDetailId,
      type: BankAccountType.BANK,
    },
    pagination: {
      skip: offset,
      take: limit,
      order: {
        created_at: "DESC",
      },
    },
  })

  const count = metadata?.count ?? 0

  if (preferences.length === 0) {
    return res.json({
      mapped_customers: [],
      count,
      offset,
      limit,
    })
  }

  const customerIds = Array.from(new Set(preferences.map((p: any) => p.customer_id).filter(Boolean)))

  const { data: customers = [] } = await query.graph({
    entity: "customer",
    fields: ["id", "first_name", "email", "phone"],
    filters: { id: { $in: customerIds } },
  })

  const customerMap = Object.fromEntries(
    customers.map((c: any) => [
      c.id,
      {
        first_name: c.first_name ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
      },
    ])
  )

  const mapped_customers = preferences.map((p: any) => {
    const customer = customerMap[p.customer_id] ?? {}

    return {
      id: p.id,
      customer_id: p.customer_id,
      first_name: customer.first_name ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
    }
  })

  res.json({
    mapped_customers,
    count,
    offset,
    limit,
  })
}
