import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import sellerProduct from "@mercurjs/core-plugin/links/product-seller-link"

export const validateSellerProductMappingStep = createStep(
  "validate-seller-product-mapping",
  async (
    input: {
      skus: string[]
      seller_id: string
    },
    { container }
  ) => {
    const { skus, seller_id } = input

    if (!skus.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No SKUs provided for validation"
      )
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "product_id"],
      filters: {
        sku: { $in: skus },
        deleted_at: { $eq: null },
      },
    })

    if (variants.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No variants found for SKUs: ${skus.join(", ")}`
      )
    }

    const foundSkus = variants.map((v: any) => v.sku).filter(Boolean)
    const missingSkus = skus.filter((sku) => !foundSkus.includes(sku))
    if (missingSkus.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Variants not found for SKUs: ${missingSkus.join(", ")}`
      )
    }

    const productIds = [...new Set(variants.map((v: any) => v.product_id))]
    const { data: sellerProductRelations } = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: ["product_id"],
      filters: {
        seller_id: seller_id,
        product_id: { $in: productIds },
      },
    })

    const validProductIds = sellerProductRelations.map((rel: any) => rel.product_id)
    const invalidVariants = variants.filter(
      (v: any) => !validProductIds.includes(v.product_id)
    )
    if (invalidVariants.length > 0) {
      const invalidSkus = invalidVariants.map((v: any) => v.sku).filter(Boolean)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `The following SKUs do not belong to seller ${seller_id}: ${invalidSkus.join(", ")}. Please ensure you only include products that are mapped to your seller account.`
      )
    }

    return new StepResponse({ validatedSkus: skus, seller_id })
  }
)
