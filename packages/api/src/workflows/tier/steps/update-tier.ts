import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TIER_MODULE } from "../../../modules/tier"
import TierModuleService from "../../../modules/tier/service"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type UpdateTierStepInput = {
  id: string
  name?: string
  promo_id?: string | null
}

export const updateTierStep = createStep(
  "update-tier",
  async (input: UpdateTierStepInput, { container }) => {
    const tierModuleService = container.resolve<TierModuleService>(TIER_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: previousTiers } = await query.graph({
      entity: "tier",
      fields: ["id", "name", "promo_id"],
      filters: { id: input.id },
    })

    if (!previousTiers || previousTiers.length === 0) {
      throw new Error(`Tier with id ${input.id} not found`)
    }
    const previousTier = previousTiers[0]
    const { id, ...updateData } = input
    const updatedTier = await tierModuleService.updateTiers({ id, ...updateData })

    return new StepResponse(updatedTier, {
      id,
      previousData: { name: previousTier.name, promo_id: previousTier.promo_id },
    })
  },
  async (revertData, { container }) => {
    if (!revertData) return
    const tierModuleService = container.resolve<TierModuleService>(TIER_MODULE)
    await tierModuleService.updateTiers({
      id: revertData.id,
      name: revertData.previousData.name,
      promo_id: revertData.previousData.promo_id,
    })
  }
)

