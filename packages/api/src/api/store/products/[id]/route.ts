import { isPresent, MedusaError } from "@medusajs/framework/utils"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "../../../utils/middlewares"
import { wrapVariantsWithSellerPricing } from "../../../utils/middlewares"
import { transformSingleProductImageUrls } from "../../../utils/middlewares"

import {
  refetchProduct,
  RequestWithContext,
  wrapProductsWithTaxPrices,
  addWishlistFlagToProducts,
} from "../helpers"
import { HttpTypes } from "@medusajs/framework/types"

export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductParams>,
  res: MedusaResponse<HttpTypes.StoreProductResponse>
) => {
  const withInventoryQuantity = req.queryConfig.fields.some((field) =>
    field.includes("variants.inventory_quantity")
  )

  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes("variants.inventory_quantity")
    )
  }

  const filters: object = {
    id: req.params.id,
    ...req.filterableFields,
  }

  if (isPresent(req.pricingContext)) {
    filters["context"] = {
      "variants.calculated_price": { context: req.pricingContext },
    }
  }

  const product = await refetchProduct(
    filters,
    req.scope,
    req.queryConfig.fields
  )

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id: ${req.params.id} was not found`
    )
  }

  if (withInventoryQuantity) {
    await wrapVariantsWithInventoryQuantityForSalesChannel(
      req,
      product.variants || []
    )
  }

  await wrapVariantsWithSellerPricing(req.scope, product.variants, req.pricingContext);
  await wrapProductsWithTaxPrices(req, [product])
  
  // Transform relative image paths to full URLs for frontend consumption
  transformSingleProductImageUrls(product);
  
  if (req.auth_context?.actor_id) {
    await addWishlistFlagToProducts(req as AuthenticatedMedusaRequest, [product])
  }
  res.json({ product })
}