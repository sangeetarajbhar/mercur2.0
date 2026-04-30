import {
  HttpTypes,
} from "@medusajs/framework/types"
import { defaultGetCartFields } from "../../../carts/query-config"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { StoreUpdateCartV2Type } from "../validators"
import { updateCartWorkflow } from "../../../../../workflows/cart/workflows/update-cart"
import { refreshCartItemsWorkflow } from "../../../../../workflows/cart/workflows/refresh-cart-items"
import { validateCart, getCompletedCartErrorResponse } from '../../../carts/utils/validate-cart'
import { getAgentType } from '../../../../../shared/utils/get-agent-type'
import {
  buildCartCrossLinks,
  enrichAppliedCartPromotionsWithDisplayText,
} from '../helpers'
import { PdpCrossLink } from '../../products/utils/pdp-sections'

/**
 * V2 Cart API - Enhanced with Delivery Promise & Inventory Validation
 *
 * This API includes:
 * 1. Cart retrieval with delivery details (delivery_date, delivery_time, delivery_slot_type)
 * 2. Delivery promise calculation based on postal code and location
 * 3. Item serviceability check
 * 4. Stock availability validation
 *
 * Available Steps (for workflow composition):
 * - refetchCartWithDeliveryDetailsStep: Fetches cart with delivery_details from cart_delivery_detail table
 * - getCartPromiseStep: Calculates delivery promise for all cart items
 *
 * Example usage in workflows:
 * ```typescript
 * import { refetchCartWithDeliveryDetailsStep } from "../steps/refetch-cart-with-delivery-details"
 * import { getCartPromiseStep } from "../../delivery-promise/steps/get-cart-promise-step"
 *
 * const cart = refetchCartWithDeliveryDetailsStep({ cart_id, fields })
 * const deliveryPromise = getCartPromiseStep({ cart, postal_code, lat, long })
 * ```
 */

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse<
    (HttpTypes.StoreCartResponse & { crossLinks: PdpCrossLink[] }) | ReturnType<typeof getCompletedCartErrorResponse>
  >
) => {
  const cartId = req.params.id

  const { cartData, isCompleted } = await validateCart(cartId, req.scope)
  if (isCompleted) {
    return res
      .status(400)
      .json(getCompletedCartErrorResponse(cartData.id))
  }

  const postal_code = req.query.postal_code as string | undefined
  const lat = req.query.lat as string | undefined
  const long = req.query.long as string | undefined
  const agentType = getAgentType(req)

  // Refresh cart items with delivery promise calculation
  const refreshWorkflow = refreshCartItemsWorkflow(req.scope)

  // Run workflow with delivery promise calculation and extra charges enabled
  // NOTE: Don't use force_refresh: true here as it causes duplicate promotion adjustments
  // Cleanup of automatic promotions when manual exist is now handled in the workflow
  const { result: cart } = await refreshWorkflow.run({
    input: {
      cart_id: cartId,
      include_delivery_promise: true,
      postal_code,
      lat,
      long,
      fields: defaultGetCartFields,
      resolution: req.query?.resolution as string | undefined,
      thumbnail_resolution: req.query?.thumbnail_resolution as string | undefined,
      agent_type: agentType,
      force_refresh: true,
    },
  })

  await enrichAppliedCartPromotionsWithDisplayText(cart, req.scope)
  const crossLinks = await buildCartCrossLinks(cart, req.scope, { relatedLimit: 8 })

  res.json({ cart, crossLinks })
}

export const POST = async (
  req: MedusaRequest<StoreUpdateCartV2Type>,
  res: MedusaResponse<{
    cart: HttpTypes.StoreCart
    crossLinks: PdpCrossLink[]
  } | ReturnType<typeof getCompletedCartErrorResponse>>
) => {
  const cartId = req.params.id

  const { cartData, isCompleted } = await validateCart(cartId, req.scope)
  if (isCompleted) {
    return res.status(400).json(getCompletedCartErrorResponse(cartData.id))
  }

  // Force country_code to 'in' for both shipping and billing addresses
  const updatedBody = { ...req.validatedBody }

  if (updatedBody.shipping_address) {
    updatedBody.shipping_address = {
      ...updatedBody.shipping_address,
      country_code: 'in'
    }
  }

  if (updatedBody.billing_address) {
    updatedBody.billing_address = {
      ...updatedBody.billing_address,
      country_code: 'in'
    }
  }

  // Update cart
  const workflow = updateCartWorkflow(req.scope)
  await workflow.run({
    input: {
      ...updatedBody,
      id: cartId,
    },
  })


  // Refresh cart items with delivery promise calculation
  const refreshWorkflow = refreshCartItemsWorkflow(req.scope)

  const postal_code = req.query.postal_code as string | undefined
  const lat = req.query.lat as string | undefined
  const long = req.query.long as string | undefined
  const agentType = getAgentType(req)

  // Run workflow with delivery promise calculation and extra charges enabled
  // NOTE: Don't use force_refresh: true here as it causes duplicate promotion adjustments
  const { result: cart } = await refreshWorkflow.run({
    input: {
      cart_id: cartId,
      include_delivery_promise: true,
      postal_code,
      lat,
      long,
      fields: defaultGetCartFields,
      resolution: req.query?.resolution as string | undefined,
      thumbnail_resolution: req.query?.thumbnail_resolution as string | undefined,
      agent_type: agentType,
    },
  })

  await enrichAppliedCartPromotionsWithDisplayText(cart, req.scope)
  const crossLinks = await buildCartCrossLinks(cart, req.scope, { relatedLimit: 8 })

  res.status(200).json({ cart, crossLinks })
}
