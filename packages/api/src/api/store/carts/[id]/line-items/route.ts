import { MedusaRequest } from '@medusajs/framework'
import { MedusaResponse } from '@medusajs/framework/http'
import { addToCartWorkflow } from "../../../../../workflows/cart/workflows"
import { StoreAddCartLineItemWithMetadataType } from "../../validators"
import { HttpTypes } from "@medusajs/framework/types"
import { defaultGetCartFields } from "../../query-config"
// import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { validateCart, getCompletedCartErrorResponse } from '../../utils/validate-cart'

export const POST = async (
  req: MedusaRequest<StoreAddCartLineItemWithMetadataType>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>
) => {
  try {
    
    const { cartData, isCompleted } = await validateCart(req.params.id, req.scope)
    if (isCompleted) {
      return res.status(400).json(getCompletedCartErrorResponse(cartData?.id) as any)
    }

    // Run addToCartWorkflow which now includes extra charges via refreshCartItemsWorkflow
    const { result: cart } = await addToCartWorkflow(req.scope).run({
      input: {
        cart_id: req.params.id,
        items: [req.validatedBody],
        fields: defaultGetCartFields, // Use defaultGetCartFields to include brand and product configuration
        additional_data: {
          resolution: req.query?.resolution,
          thumbnail_resolution: req.query?.thumbnail_resolution
        }
      },
    })

    console.log("cart", cart);
    console.dir(cart, { depth: null });

    res.status(200).json({ cart: cart as HttpTypes.StoreCart })
  } catch (error: any) {
    // Check if this is a validation error
    if (error.validationFailed) {
      return res.status(200).json({
        success: false,
        message: error.message || 'Insufficient inventory available',
        availableQty: error.availableQty
      } as any)
    }
    // Re-throw other errors
    throw error
  }
}
