import {
  WorkflowResponse,
  createWorkflow,
  when,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { updateTierStep } from "../steps/update-tier"
import { deleteTierRulesStep } from "../steps/delete-tier-rules"
import { createTierRulesStep } from "../steps/create-tier-rules"

export type UpdateTierWorkflowInput = {
  id: string
  name?: string
  promo_id?: string | null
  tier_rules?: Array<{
    min_purchase_value: number
    currency_code: string
  }>
}

export const updateTierWorkflow = createWorkflow(
  "update-tier",
  (input: UpdateTierWorkflowInput) => {
    // 1. Retrieve the tier to update
    const { data: existingTiers } = useQueryGraphStep({
      entity: "tier",
      fields: ["id", "tier_rules.id"],
      filters: {
        id: input.id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "retrieve-existing-tier" })

    // 2. Validate promotion if provided
    when({ input }, (data) => !!data.input.promo_id).then(() => {
      return useQueryGraphStep({
        entity: "promotion",
        fields: ["id"],
        filters: {
          id: input.promo_id!,
        },
        options: {
          throwIfKeyNotFound: true,
        },
      }) as any
    })

    // 3. Update the tier
    updateTierStep({
      id: input.id,
      name: input.name,
      promo_id: input.promo_id || null,
    })

    // 4. Get existing rule IDs to delete (if tier rules are being updated)
    // const existingRuleIds = transform(
    //   { input, existingTiers },
    //   ({ input, existingTiers }) => {
    //     if (!input.tier_rules?.length) {
    //       return []
    //     }
    //     const tier = (existingTiers as any)?.[0]
    //     return ((tier?.tier_rules as any[]) || [])
    //       .map((rule: any) => rule?.id)
    //       .filter(Boolean)
    //   }
    // )
    const existingRuleIds = transform(
      { input, existingTiers: existingTiers as any },
      ({ input, existingTiers }: any) => {
        if (!input.tier_rules?.length) {
          return []
        }
        const tier = (existingTiers as any)?.[0]
        return ((tier?.tier_rules as any[]) || [])
          .map((rule: any) => rule?.id)
          .filter(Boolean)
      }
    )

    // 5. Delete existing tier rules if any exist and new rules are provided
    when({ input, existingRuleIds }, (data) => {
      return !!data.input.tier_rules?.length && data.existingRuleIds.length > 0
    }).then(() => {
      return deleteTierRulesStep({
        ids: existingRuleIds,
      })
    })

    // 6. Create new tier rules if provided
    when({ input }, (data) => {
      return !!data.input.tier_rules?.length
    }).then(() => {
      return createTierRulesStep({
        tier_id: input.id,
        tier_rules: input.tier_rules!,
      })
    })

    // 7. Retrieve the updated tier with rules
    const { data: tiers } = useQueryGraphStep({
      entity: "tier",
      fields: ["*", "tier_rules.*", "promotion.id", "promotion.code", "promotion.status"],
      filters: {
        id: input.id,
      },
    }).config({ name: "retrieve-updated-tier" })

    return new WorkflowResponse({
      tier: (tiers as any)[0],
    })
  }
)
