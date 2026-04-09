import { MedusaRequest } from '@medusajs/framework'
import { MedusaResponse } from '@medusajs/framework/http'
import { addToCartWorkflow } from "../../../../../../src/workflows/cart/workflows/add-to-cart"
import { StoreAddCartLineItemWithMetadataType } from "../../validators"
import { HttpTypes } from "@medusajs/types"
import { defaultGetCartFields } from "../../query-config"
// import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { validateCart, getCompletedCartErrorResponse } from '../../utils/validate-cart'

export const POST = async (
  req: MedusaRequest<StoreAddCartLineItemWithMetadataType>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>
) => {
  try {
    // Check if cart is completed before adding items
    // const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    // const { data: carts } = await query.graph({
    //   entity: 'cart',
    //   filters: { id: req.params.id },
    //   fields: ['id', 'completed_at']
    // })

    // const cartData = carts?.[0]
    // if (!cartData) {
    //   throw new MedusaError(
    //     MedusaError.Types.NOT_FOUND,
    //     `Cart with id: ${req.params.id} was not found`
    //   )
    // }

    // // Prevent adding items to completed cart
    // if (cartData.completed_at) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'CART_COMPLETED',
    //     message: 'Cannot add items to a completed cart',
    //     cart_id: cartData.id
    //   } as any)
    // }

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
