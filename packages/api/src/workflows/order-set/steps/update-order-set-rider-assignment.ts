import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
// import { MARKETPLACE_MODULE, MarketplaceModuleService } from '@mercurjs/marketplace'
const MARKETPLACE_MODULE = 'marketplace'
type MarketplaceModuleService = any

type UpdateOrderSetRiderAssignmentInput = {
  orderSetId: string | null | undefined
  metadata: Record<string, unknown>
}

type UpdateOrderSetRiderAssignmentCompensation = {
  orderSetId: string
  rider_assigned_at: string | Date | null
  metadata: Record<string, unknown> | null
}

export const updateOrderSetRiderAssignmentStep = createStep(
  'update-order-set-rider-assignment',
  async (
    input: UpdateOrderSetRiderAssignmentInput,
    { container }
  ): Promise<
    StepResponse<
      { orderSetId: string },
      UpdateOrderSetRiderAssignmentCompensation | null
    >
  > => {
    const { orderSetId, metadata } = input

    if (!orderSetId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'orderSetId is required to assign rider details'
      )
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const marketplaceService =
      container.resolve<MarketplaceModuleService>(MARKETPLACE_MODULE)

    const { data } = await query.graph({
      entity: 'order_set',
      fields: ['id', 'rider_assigned_at', 'metadata'],
      filters: {
        id: orderSetId
      }
    })

    const orderSet = data?.[0]

    if (!orderSet) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `order_set with id ${orderSetId} not found`
      )
    }

    const now = new Date()

    await knex('order_set')
      .where({ id: orderSetId })
      .update({
        rider_assigned_at: now,
        metadata: knex.raw('?::jsonb', [JSON.stringify(metadata ?? {})])
      })

    // Update the module cache to keep it in sync
    await (marketplaceService.updateOrderSets as any)({
      id: orderSetId,
      rider_assigned_at: now,
      metadata: metadata ?? {}
    })

    return new StepResponse(
      { orderSetId },
      {
        orderSetId,
        rider_assigned_at: orderSet.rider_assigned_at ?? null,
        metadata: (orderSet.metadata as Record<string, unknown> | null) ?? null
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.orderSetId) {
      return
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const marketplaceService =
      container.resolve<MarketplaceModuleService>(MARKETPLACE_MODULE)

    await knex('order_set')
      .where({ id: compensationData.orderSetId })
      .update({
        rider_assigned_at: compensationData.rider_assigned_at
          ? new Date(compensationData.rider_assigned_at)
          : null,
        metadata: compensationData.metadata
          ? knex.raw('?::jsonb', [JSON.stringify(compensationData.metadata)])
          : null
      })

    await (marketplaceService.updateOrderSets as any)({
      id: compensationData.orderSetId,
      rider_assigned_at: compensationData.rider_assigned_at ?? null,
      metadata: compensationData.metadata ?? null
    })
  }
)


