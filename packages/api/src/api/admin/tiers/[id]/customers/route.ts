import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { processTierCustomers } from "../../services/tier-customer.service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params
  const originalTake = req.queryConfig?.pagination?.take || 15
  const originalSkip = req.queryConfig?.pagination?.skip || 0

  const { data: tiers } = await query.graph({
    entity: "tier",
    fields: [
      "id",
      "customers.id",
      "customers.email",
      "customers.first_name",
      "customers.last_name",
      "customers.deleted_at",
    ],
    filters: { id },
  })

  const rawCustomers = ((tiers?.[0] as { customers?: Array<{ id: string; email?: string; first_name?: string | null; last_name?: string | null; deleted_at?: Date | null }> })?.customers || []) as Array<{ id: string; email?: string; first_name?: string | null; last_name?: string | null; deleted_at?: Date | null }>
  const customers = rawCustomers.filter((c) => !c.deleted_at)
  const paginatedCustomers = customers.slice(originalSkip, originalSkip + originalTake)

  res.json({
    customers: paginatedCustomers,
    count: customers.length,
    offset: originalSkip,
    limit: originalTake,
  })
}

export async function POST(
  req: MedusaRequest<{ customers: Array<{ customer_id: string; action: "add" | "remove" }> }>,
  res: MedusaResponse
): Promise<void> {
  const { id: tierId } = req.params
  const { customers } = req.body as { customers: Array<{ customer_id: string; action: "add" | "remove" }> }

  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    res.status(400).json({ message: "customers array is required and must not be empty" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  try {
    const result = await processTierCustomers(query, link, tierId, customers)
    res.json(result)
  } catch (err) {
    const message = (err as Error)?.message || "Failed to process tier customers"
    const notificationService = req.scope.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: "",
      channel: "feed",
      template: "admin-ui",
      content: {
        subject: "Tier customer assignment failed",
      },
      data: {
        title: "Tier customer assignment failed",
        description: message,
        redirect: "/admin/tiers",
      },
    }).catch(() => {})
    throw err
  }
}

