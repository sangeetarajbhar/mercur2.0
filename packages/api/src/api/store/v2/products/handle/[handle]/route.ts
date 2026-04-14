import { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { HttpTypes } from "@medusajs/framework/types"

import {
  refetchProduct,
  RequestWithContext,
} from "../../helpers"
import { GET as getProductById } from "../../[id]/route"

/**
 * GET /store/v2/products/handle/:handle
 *
 * This endpoint returns the same response shape as
 * GET /store/v2/products/:id but resolves the product by handle first.
 */
export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductParams>,
  res: MedusaResponse<HttpTypes.StoreProductResponse>
) => {
  const handle = (req.params as any).handle as string | undefined

  if (!handle) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product handle must be provided"
    )
  }

  // First resolve the product ID using the handle so we can reuse
  // the existing /store/v2/products/:id logic.
  const product = await refetchProduct(
    { handle },
    req.scope,
    ["id"]
  )

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with handle: ${handle} was not found`
    )
  }

  // Set the resolved product id on params so the existing handler
  // can run with exactly the same code path and response shape.
  ;(req as any).params.id = product.id

  return getProductById(req as any, res)
}


