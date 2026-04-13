import { Modules, MedusaError } from "@medusajs/framework/utils"
import { TIER_MODULE } from "../../../../modules/tier"

export const MAX_CUSTOMERS = 5000
export const BATCH_SIZE = 50

export async function dismissTierCustomerLinks(link: any, query: any, tierId: string): Promise<{ dismissed: number }> {
  let totalDismissed = 0
  const { data: tiers } = await query.graph({
    entity: "tier",
    fields: ["id", "customers.id"],
    filters: { id: tierId },
  })

  type TierWithCustomers = { id: string; customers?: { id: string }[] }
  const customerIds: string[] = (tiers?.[0] as TierWithCustomers)?.customers?.map((c) => c.id) ?? []

  for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
    const batch = customerIds.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (customerId) => {
        await link.dismiss({
          [TIER_MODULE]: { tier_id: tierId },
          [Modules.CUSTOMER]: { customer_id: customerId },
        })
      })
    )
    totalDismissed += batch.length
  }
  return { dismissed: totalDismissed }
}

export async function processTierCustomers(
  query: any,
  link: any,
  tierId: string,
  customers: Array<{ customer_id: string; action: "add" | "remove" }>
) {
  if (customers.length > MAX_CUSTOMERS) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Maximum ${MAX_CUSTOMERS} customers allowed per upload.`)
  }

  let assigned = 0
  let removed = 0

  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE)
    const customerIds = batch.map((b) => b.customer_id)
    const { data: existing } = await query.graph({
      entity: "customer",
      fields: ["id", "tier.id", "tier.name"],
      filters: { id: customerIds },
    })
    const map = new Map(existing.map((c: any) => [c.id, c]))

    await Promise.all(batch.map(async ({ customer_id, action }) => {
      const customer: any = map.get(customer_id)
      if (!customer) throw new MedusaError(MedusaError.Types.INVALID_DATA, `Customer not found: ${customer_id}`)

      if (action === "add") {
        if (customer?.tier?.id) {
          throw new MedusaError(MedusaError.Types.INVALID_DATA, `Customer ${customer_id} is already assigned to a tier`)
        }
        await link.create({
          [TIER_MODULE]: { tier_id: tierId },
          [Modules.CUSTOMER]: { customer_id },
        })
        assigned += 1
      } else {
        if (customer?.tier?.id !== tierId) {
          throw new MedusaError(MedusaError.Types.INVALID_DATA, `Customer ${customer_id} is not assigned to this tier`)
        }
        await link.dismiss({
          [TIER_MODULE]: { tier_id: tierId },
          [Modules.CUSTOMER]: { customer_id },
        })
        removed += 1
      }
    }))
  }

  return {
    assigned,
    removed,
    skipped: 0,
    message: `Successfully assigned ${assigned} and removed ${removed} customer(s) from tier`,
  }
}

