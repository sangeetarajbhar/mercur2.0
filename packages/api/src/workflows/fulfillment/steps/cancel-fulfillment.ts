import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { Modules } from '@medusajs/framework/utils'
import type { IFulfillmentModuleService } from '@medusajs/framework/types'

// Extend UpdateFulfillmentDTO to include shipped_at
type UpdateFulfillmentDTO = Parameters<IFulfillmentModuleService['updateFulfillment']>[1]
interface ExtendedUpdateFulfillmentDTO extends Partial<UpdateFulfillmentDTO> {
  shipped_at?: Date | null
}

type CancelFulfillmentStepInput = {
  fulfillment_id: string
  fulfillment: {
    shipped_at?: Date | null
  }
}

/**
 * This step clears the shipped_at field from a fulfillment if it exists,
 * which is required before canceling a fulfillment that has been shipped.
 */
export const clearShippedAtStep = createStep(
  'clear-shipped-at',
  async ({ fulfillment_id, fulfillment }: CancelFulfillmentStepInput, { container }) => {
    const fulfillmentModuleService = container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)

    if (fulfillment?.shipped_at) {  
      const updatedFulfillment = await fulfillmentModuleService.updateFulfillment(
        fulfillment_id,
        { shipped_at: null } as ExtendedUpdateFulfillmentDTO
      )
      return new StepResponse({ cleared: true })
    }

    return new StepResponse({ cleared: false })
  }
)

