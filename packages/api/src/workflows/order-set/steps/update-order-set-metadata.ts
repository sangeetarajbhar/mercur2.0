import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import  {MARKETPLACE_MODULE} from '../../../modules/marketplace'
import MarketplaceModuleService  from '../../../modules/marketplace/service'

type UpdateOrderSetMetadataInput = {
  orderSetId: string | null | undefined
  metadata: Record<string, unknown>
}

type UpdateOrderSetMetadataCompensation = {
  orderSetId: string
  metadata: Record<string, unknown> | null
}

export const updateOrderSetMetadataStep = createStep(
  'update-order-set-metadata',
  async (
    input: UpdateOrderSetMetadataInput,
    { container }
  ): Promise<
    StepResponse<
      { orderSetId: string },
      UpdateOrderSetMetadataCompensation | null
    >
  > => {
    const { orderSetId, metadata } = input

    if (!orderSetId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'orderSetId is required to update metadata'
      )
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const marketplaceService =
      container.resolve<MarketplaceModuleService>(MARKETPLACE_MODULE)

    const { data } = await query.graph({
      entity: 'order_set',
      fields: ['id', 'metadata'],
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

    // Get existing metadata for compensation
    const existingMetadata = (orderSet.metadata as Record<string, unknown> | null) ?? {}

    // Replace existing metadata with new metadata (override, not merge)
    await knex('order_set')
      .where({ id: orderSetId })
      .update({
        metadata: knex.raw('?::jsonb', [JSON.stringify(metadata)])
      })

    // Update the module cache to keep it in sync
    await (marketplaceService.updateOrderSets as any)({
      id: orderSetId,
      metadata: metadata
    })

    return new StepResponse(
      { orderSetId },
      {
        orderSetId,
        metadata: existingMetadata
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
        metadata: compensationData.metadata
          ? knex.raw('?::jsonb', [JSON.stringify(compensationData.metadata)])
          : null
      })

    await (marketplaceService.updateOrderSets as any)({
      id: compensationData.orderSetId,
      metadata: compensationData.metadata ?? null
    })
  }
)

