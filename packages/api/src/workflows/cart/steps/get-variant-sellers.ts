import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

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
      const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
        graph: (args: {
          entity: string
          fields: string[]
          filters?: Record<string, unknown>
        }) => Promise<{ data: Array<Record<string, unknown>> }>
      }

      const { data } = await query.graph({
        entity: 'product_variant',
        fields: ['id', 'seller.id'],
        filters: { id: input.variant_ids }
      })

      const variantSellerMap = new Map<string, string>()
      data.forEach((variant) => {
        const variantId = String(variant.id || '')
        const sellerField = variant.seller as unknown
        const seller =
          Array.isArray(sellerField) && sellerField.length
            ? (sellerField[0] as Record<string, unknown>)
            : (sellerField as Record<string, unknown> | undefined)

        const sellerId = seller?.id ? String(seller.id) : ''
        if (variantId && sellerId) {
          variantSellerMap.set(variantId, sellerId)
        }
      })

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