import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import { TIER_MODULE } from "../../../../modules/tier"
import { updateTierWorkflow } from "../../../../workflows/tier/workflows/update-tier"
import { AdminUpdateTier } from "../validators"
import { dismissTierCustomerLinks } from "../services/tier-customer.service"
import TierModuleService from "../../../../modules/tier/service"

type UpdateTierInput = z.infer<typeof AdminUpdateTier>

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const tierId = req.params.id

  const { data: tiers } = await query.graph({
    entity: "tier",
    fields: [
      "id",
      "name",
      "promo_id",
      "tier_rules.*",
      "promotion.id",
      "promotion.code",
      "promotion.status",
    ],
    filters: {
      id: tierId,
    },
  })

  if (!tiers || tiers.length === 0) {
    res.status(404).json({ message: "Tier not found" })
    return
  }

  res.json({ tier: tiers[0] })
}

export async function POST(
  req: MedusaRequest<UpdateTierInput>,
  res: MedusaResponse
): Promise<void> {
  const tierId = req.params.id
  const { name, promo_id, tier_rules } = req.validatedBody

  const { result } = await updateTierWorkflow(req.scope).run({
    input: {
      id: tierId,
      name,
      promo_id: promo_id || null,
      tier_rules: tier_rules,
    },
  })

  res.json({ tier: result.tier })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const tierId = req.params.id
  const tierModuleService = req.scope.resolve(TIER_MODULE) as TierModuleService
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const { dismissed } = await dismissTierCustomerLinks(link, query, tierId)
  await tierModuleService.deleteTiers(tierId)

  res.status(200).json({
    id: tierId,
    object: "tier",
    deleted: true,
    linksRemoved: dismissed,
  })
}

