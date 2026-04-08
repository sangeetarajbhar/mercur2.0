import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import CartModuleService from '../../../../../modules/cart/service'

/**
 * API endpoint to manually trigger seller-specific price updates
 * for all line items in a cart that have seller_id in metadata
 */
interface ApplySellerPricesRequest {
  custom_price?: number;
  variant_id?: string;
  seller_id?: string;
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  // Extract data from request body
  const { custom_price, variant_id, seller_id } = req.body as ApplySellerPricesRequest

  try {
    // Add a small delay to ensure database transactions have completed
    await new Promise(resolve => setTimeout(resolve, 500))

    // Get the CartModuleService with proper typing using the alias specified in medusa-config.ts
    const cartModuleService = req.scope.resolve('seller_cart_pricing') as CartModuleService

    // Apply seller-specific prices to this cart, passing custom price if available
    const result = await cartModuleService.applySellerPricesToCart(id, {
      custom_price: custom_price !== undefined ? Number(custom_price) : undefined,
      variant_id,
      seller_id
    })

    // Return the result
    res.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error(`Error applying seller prices to cart ${id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Failed to apply seller prices',
      message: error.message
    })
  }
}
