import {
  MedusaError
} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { VariantSellerService } from '@mercurjs/seller'

type GetVariantSellersInput = {
  variant_ids: string[]
}

export const getVariantSellersStep = createStep(
  'get-variant-sellers',
  async (input: GetVariantSellersInput, { container }) => {
    if (!input.variant_ids?.length) {
      return new StepResponse({
        variantSellerMap: new Map()
      })
    }

    try {
      // Create a new instance of the service with the container
      const variantSellerService = new VariantSellerService(container)

      const variantSellerMap = await variantSellerService.retrieveSellersByVariantIds(
        input.variant_ids
      )

      return new StepResponse({
        variantSellerMap
      })
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get variant sellers: ${error.message}`
      )
    }
  }
)