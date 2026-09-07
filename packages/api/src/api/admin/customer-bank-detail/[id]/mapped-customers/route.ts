import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { BankAccountType } from "../../../../../utils/constants/bank_account_verification"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const userId = req.auth_context?.actor_id
  if (!userId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized user")
  }

  const bankDetailId = req.params.id
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: preferences = [], metadata } = await query.graph({
    entity: "customer_payment_preferences",
    fields: ["id", "customer_id"],
    filters: { type_id: bankDetailId, type: BankAccountType.BANK },
    pagination: { skip: offset, take: limit },
  })

  const customerIds = Array.from(new Set(preferences.map((p: any) => p.customer_id).filter(Boolean)))
  const { data: customers = [] } = customerIds.length
    ? await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "email", "phone"],
        filters: { id: { $in: customerIds } },
      })
    : { data: [] as any[] }

  const customerMap = Object.fromEntries(customers.map((c: any) => [c.id, c]))
  const mapped_customers = preferences.map((p: any) => ({
    id: p.id,
    customer_id: p.customer_id,
    first_name: customerMap[p.customer_id]?.first_name ?? null,
    email: customerMap[p.customer_id]?.email ?? null,
    phone: customerMap[p.customer_id]?.phone ?? null,
  }))

  res.json({ mapped_customers, count: metadata?.count ?? 0, offset, limit })
}
