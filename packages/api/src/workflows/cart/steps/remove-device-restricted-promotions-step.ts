import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import promotionExtensionLink from "../../../links/promotion-custom"
import { AgentType } from "../../../shared/utils/get-agent-type"

export interface RemoveDeviceRestrictedPromotionsStepInput {
  cart_id: string
  agent_type?: AgentType
}

export const removeDeviceRestrictedPromotionsStepId = "remove-device-restricted-promotions"

type CompensationData = {
  cart_id: string
  removedCodes: string[]
  restrictedPromotionIds: string[]
  adjustmentIds: string[]
}

/**
 * Remove promotions from the cart that are restricted to a different device (app/web).
 * Uses direct Knex operations to avoid deadlock (same pattern as cleanupAutoPromotionsStep).
 */
export const removeDeviceRestrictedPromotionsStep = createStep(
  removeDeviceRestrictedPromotionsStepId,
  async (input: RemoveDeviceRestrictedPromotionsStepInput, { container }) => {
    const { cart_id, agent_type } = input

    // Helper for empty response
    const emptyResponse = (): StepResponse<{ removedCodes: string[]; adjustmentIds: string[] }, CompensationData> => {
      return new StepResponse(
        { removedCodes: [], adjustmentIds: [] },
        { cart_id, removedCodes: [], restrictedPromotionIds: [], adjustmentIds: [] }
      )
    }

    // Early exit if no agent_type
    if (!agent_type) {
      return emptyResponse()
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Get cart promotions
    const { data: [cart] } = await query.graph({
      entity: 'cart',
      fields: ['id', 'promotions.id'],
      filters: { id: cart_id }
    })

    const promotionIds =
      (cart?.promotions ?? [])
        .filter((p) => p != null && p.id != null)
        .map((p) => p?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)

    if (promotionIds.length === 0) {
      return emptyResponse()
    }

    // Get promotion extensions to check device restrictions
    const { data: extLinks } = await query.graph({
      entity: promotionExtensionLink.entryPoint,
      fields: ['promotion_id', 'promotion_extension.applicable_on'],
      filters: { promotion_id: promotionIds }
    })

    if (!extLinks?.length) {
      return emptyResponse()
    }

    // Build map: promotion_id -> applicable_on
    const applicableOnMap = new Map<string, string>()
    for (const link of extLinks) {
      if (link.promotion_id && link.promotion_extension) {
        applicableOnMap.set(link.promotion_id, link.promotion_extension.applicable_on ?? 'all')
      }
    }

    // Find promotions restricted to a different device
    const restrictedPromotionIds = promotionIds.filter((id: string) => {
      const applicableOn = applicableOnMap.get(id) ?? 'all'
      return applicableOn !== 'all' && applicableOn !== agent_type
    })

    if (restrictedPromotionIds.length === 0) {
      return emptyResponse()
    }

    // Get promotion codes for logging
    const { data: promotions } = await query.graph({
      entity: 'promotion',
      fields: ['id', 'code'],
      filters: { id: restrictedPromotionIds }
    })

    const removedCodes =
      (promotions ?? [])
        .filter((p) => p != null && p.code != null)
        .map((p) => p?.code)
        .filter((code): code is string => typeof code === "string" && code.length > 0)

    // Get line items to find adjustments
    const lineItems = await knex('cart_line_item')
      .select(['id'])
      .where('cart_id', cart_id)
      .whereNull('deleted_at')

    let adjustmentIds: string[] = []

    if (lineItems.length > 0) {
      const lineItemIds = lineItems.map((li: { id: string }) => li.id)

      // Find and soft-delete adjustments
      const adjustments = await knex('cart_line_item_adjustment')
        .select(['id'])
        .whereIn('item_id', lineItemIds)
        .whereIn('promotion_id', restrictedPromotionIds)
        .whereNull('deleted_at')

      adjustmentIds = adjustments.map((adj: { id: string }) => adj.id)

      if (adjustmentIds.length > 0) {
        await knex('cart_line_item_adjustment')
          .whereIn('id', adjustmentIds)
          .update({ deleted_at: new Date() })
      }
    }

    // Soft-delete from cart_promotion
    await knex('cart_promotion')
      .where('cart_id', cart_id)
      .whereIn('promotion_id', restrictedPromotionIds)
      .whereNull('deleted_at')
      .update({ deleted_at: new Date() })

    // Update cart timestamp to trigger recalculation
    await knex('cart')
      .where('id', cart_id)
      .update({ updated_at: new Date() })

    if (removedCodes.length > 0) {
      console.log(
        `[DEVICE RESTRICTION] Cart ${cart_id}: Removed ${removedCodes.length} promotion(s) ` +
        `not applicable on '${agent_type}': ${removedCodes.join(', ')}`
      )
    }

    return new StepResponse(
      { removedCodes, adjustmentIds },
      { cart_id, removedCodes, restrictedPromotionIds, adjustmentIds }
    )
  },
  // Compensation: restore removed promotions
  async (compensationData: CompensationData, { container }) => {
    const { cart_id, removedCodes, restrictedPromotionIds, adjustmentIds } = compensationData

    if (!removedCodes?.length) {
      return
    }

    try {
      const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

      // Restore cart_promotion entries
      if (restrictedPromotionIds?.length) {
        await knex('cart_promotion')
          .where('cart_id', cart_id)
          .whereIn('promotion_id', restrictedPromotionIds)
          .update({ deleted_at: null })
      }

      // Restore adjustments
      if (adjustmentIds?.length) {
        await knex('cart_line_item_adjustment')
          .whereIn('id', adjustmentIds)
          .update({ deleted_at: null })
      }

      // Update cart timestamp
      await knex('cart')
        .where('id', cart_id)
        .update({ updated_at: new Date() })

      console.log(
        `[DEVICE RESTRICTION COMPENSATION] Cart ${cart_id}: Restored ${removedCodes.length} promotion(s): ${removedCodes.join(', ')}`
      )
    } catch (error) {
      console.error(
        `[DEVICE RESTRICTION COMPENSATION] Failed to restore promotions for cart ${cart_id}:`,
        error
      )
    }
  }
)

