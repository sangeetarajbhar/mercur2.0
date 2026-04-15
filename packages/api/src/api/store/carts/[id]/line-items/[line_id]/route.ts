import { MedusaRequest } from '@medusajs/framework'
import { MedusaResponse, prepareListQuery } from '@medusajs/framework/http'
import { HttpTypes } from '@medusajs/framework/types'
import { deleteSellerLineItemWorkflow } from '../../../../../../workflows/cart/workflows/delete-seller-line-item'
import { StoreUpdateCartLineItemWithMetadataType } from '../../../validators'
import { refetchCart } from '../../../../v2/carts/helpers'
import { MedusaError } from '@medusajs/framework/utils'
import { updateLineItemInCartWorkflow } from '../../../../../../workflows/cart/workflows/update-line-item-in-cart'
import { defaultGetCartFields } from '../../../query-config'
import {
  buildCartCrossLinks,
  enrichAppliedCartPromotionsWithDisplayText,
} from '../../../../v2/carts/helpers'
import { PdpCrossLink } from '../../../../v2/products/utils/pdp-sections'

export const POST = async (
  req: MedusaRequest<StoreUpdateCartLineItemWithMetadataType>,
  res: MedusaResponse<HttpTypes.StoreCartResponse & { crossLinks: PdpCrossLink[] }>
) => {
  const { remoteQueryConfig } = await prepareListQuery(
    {},
    {
      defaults: [
        "id",
        "region_id",
        "customer_id",
        "sales_channel_id",
        "currency_code",
        "completed_at",
        "*items",
      ],
    }
  )

  const cart = await refetchCart(
    req.params.id,
    req.scope,
    remoteQueryConfig.fields
  )

  // Prevent updating items in completed cart
  if (cart.completed_at) {
    return res.status(400).json({
      success: false,
      error: 'CART_COMPLETED',
      message: 'Cannot update items in a completed cart',
      cart_id: cart.id
    } as any)
  }

  const item = cart.items?.find((i) => i.id === req.params.line_id)
  if (!item) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Line item with id: ${req.params.line_id} was not found`
    )
  }

  try {
    // Run updateLineItemInCartWorkflow which now includes extra charges via refreshCartItemsWorkflow
    const { result: updatedCart }: any = await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id: req.params.id,
        item_id: item.id,
        update: req.validatedBody,
        fields: defaultGetCartFields, // Use defaultGetCartFields to include brand and product configuration
        additional_data: {
          resolution: req.query?.resolution,
          thumbnail_resolution: req.query?.thumbnail_resolution
        }
      },
    })

    await enrichAppliedCartPromotionsWithDisplayText(updatedCart, req.scope)
    const crossLinks = await buildCartCrossLinks(updatedCart, req.scope, {
      relatedLimit: 8,
      preferredLineItemId: req.params.line_id,
    })

    // Cart already has thumbnails transformed by refreshCartItemsWorkflow (with resolution passed via additional_data)

    res.status(200).json({ cart: updatedCart, crossLinks })
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

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  // Check if cart is completed before deleting items
  const cart = await refetchCart(
    req.params.id,
    req.scope,
    ["id", "completed_at"]
  )

  // Prevent deleting items from completed cart
  if (cart.completed_at) {
    return res.status(400).json({
      success: false,
      error: 'CART_COMPLETED',
      message: 'Cannot delete items from a completed cart',
      cart_id: cart.id
    } as any)
  }

  const id = req.params.line_id

  await deleteSellerLineItemWorkflow(req.scope).run({
    input: { cart_id: req.params.id, id }
  })

  res.status(200).json({
    id: id,
    object: 'line-item',
    deleted: true
  })
}
