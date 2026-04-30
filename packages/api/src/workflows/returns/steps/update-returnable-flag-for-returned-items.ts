import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

interface UpdateReturnableFlagInput {
  lineItemIds: string[]
}

interface CompensationEntry {
  id: string
  order_line_item_id: string
  previous_flag: boolean
}

// Helper function to update returnable flag (can be called directly)
export async function updateReturnableFlagForReturnedItems(
  lineItemIds: string[],
  container: any
): Promise<void> {
  if (!lineItemIds || lineItemIds.length === 0) {
    return
  }

  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  await knex('order_line_item_extension')
    .whereIn('order_line_item_id', lineItemIds)
    .update({
      returnable_flag: false,
      updated_at: knex.fn.now()
    })
}

export const updateReturnableFlagForReturnedItemsStep = createStep(
  'update-returnable-flag-for-returned-items',
  async (
    input: UpdateReturnableFlagInput,
    { container }
  ): Promise<StepResponse<CompensationEntry[], CompensationEntry[]>> => {
    const { lineItemIds } = input

    if (!lineItemIds || lineItemIds.length === 0) {
      return new StepResponse([], [])
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Get existing records to store for compensation
    const existingRecords = await knex('order_line_item_extension')
      .select('id', 'order_line_item_id', 'returnable_flag')
      .whereIn('order_line_item_id', lineItemIds)

    if (!existingRecords.length) {
      return new StepResponse([], [])
    }

    // Update returnable_flag to false for all returned items
    await knex('order_line_item_extension')
      .whereIn('order_line_item_id', lineItemIds)
      .update({
        returnable_flag: false,
        updated_at: knex.fn.now()
      })

    const compensationData: CompensationEntry[] = existingRecords.map(
      (record) => ({
        id: record.id,
        order_line_item_id: record.order_line_item_id,
        previous_flag: record.returnable_flag
      })
    )

    return new StepResponse(compensationData, compensationData)
  },
  async (compensationData, { container }) => {
    if (!compensationData?.length) {
      return
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    for (const record of compensationData) {
      await knex('order_line_item_extension')
        .where({ id: record.id })
        .update({ returnable_flag: record.previous_flag })
    }
  }
)

