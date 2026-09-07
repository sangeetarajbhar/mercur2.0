import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import { createTierWorkflow } from "../../../workflows/tier/workflows/create-tier"
import { AdminCreateTier } from "./validators"

type CreateTierInput = z.infer<typeof AdminCreateTier>

export async function POST(
  req: MedusaRequest<CreateTierInput>,
  res: MedusaResponse
): Promise<void> {
  const { name, promo_id, tier_rules } = req.validatedBody

  const { result } = await createTierWorkflow(req.scope).run({
    input: {
      name,
      promo_id: promo_id || null,
      tier_rules: tier_rules || [],
    },
  })

  res.json({ tier: result.tier })
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const filters: Record<string, unknown> = { ...req.filterableFields }

  if (filters.q) {
    const searchTerm = String(filters.q)
    delete filters.q
    if (filters.name) {
      const existingNameFilter = filters.name
      filters.$or = [
        { name: existingNameFilter },
        { name: { $ilike: `%${searchTerm}%` } }
      ]
      delete filters.name
    } else {
      filters.name = { $ilike: `%${searchTerm}%` }
    }
  }

  const { data: tiers, metadata } = await query.graph({
    entity: "tier",
    fields: req.queryConfig?.fields || [
      "id",
      "name",
      "promo_id",
      "tier_rules.*",
      "promotion.id",
      "promotion.code",
    ],
    filters: filters,
    pagination: req.queryConfig?.pagination || {},
  })

  res.json({
    tiers,
    count: metadata?.count || 0,
    offset: metadata?.skip || 0,
    limit: metadata?.take || 15,
  })
}

