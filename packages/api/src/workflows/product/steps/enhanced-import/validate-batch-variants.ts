import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

export const validateBatchVariantsStepId = 'validate-batch-variants'

export const validateBatchVariantsStep = createStep(
  validateBatchVariantsStepId,
  async ({ batchInput }: { batchInput: any }, { container }) => {
    if (!batchInput.update?.length) {
      return new StepResponse({ status: 'skipped', validatedProducts: 0 })
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    // Validate required fields for product updates
    const fieldValidationErrors: string[] = []

    for (let i = 0; i < batchInput.update.length; i++) {
      const product = batchInput.update[i]
      const productIndex = i + 1

      // Check required product ID (normalized as "id" in the product object)
      if (!product.id) {
        fieldValidationErrors.push(`Product ${productIndex}: Missing product id`)
      }

      // Check required variant fields if variants exist
      if (product.variants?.length > 0) {
        for (let j = 0; j < product.variants.length; j++) {
          const variant = product.variants[j]
          const variantIndex = j + 1

          // Check required variant ID (normalized as "id" in the variant object)
          // if (!variant.id) {
          //   fieldValidationErrors.push(`Product ${productIndex}, Variant ${variantIndex}: Missing variant id`)
          // }

          // Check required variant price/MRP (normalized as "prices" array)
          if (!variant.prices || variant.prices.length === 0) {
            fieldValidationErrors.push(`Product ${productIndex}, Variant ${variantIndex}: Missing variant price (MRP)`)
          }
        }
      }
    }

    // Fail fast if required fields are missing
    if (fieldValidationErrors.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Import failed: Required fields missing.\n\n${fieldValidationErrors.join('\n')}\n\nFor product updates, Product ID, Variant ID, and Variant Price are required in CSV.`
      )
    }

    // Filter products that have variants to validate
    const productsWithVariants = batchInput.update.filter(
      p => p.variants?.length > 0 && p.id
    )

    if (productsWithVariants.length === 0) {
      return new StepResponse({ status: 'validated', validatedProducts: batchInput.update.length })
    }

    // Single batch query for all products
    const productIds = productsWithVariants.map(p => p.id)
    const { data: existingProducts } = await query.graph({
      entity: 'product',
      fields: ['id', 'status', 'variants.id'],
      filters: { id: productIds }
    })

    // Create lookup maps for O(1) access
    const existingProductMap = new Map<string, string[]>(
      existingProducts
        .filter(p => !['draft', 'proposed'].includes(p.status))
        .map(p => [p.id, p.variants?.map(v => v.id) || []])
    )

    const providedVariantMap = new Map<string, Set<string>>(
      productsWithVariants.map(p => [
        p.id,
        new Set(p.variants.map(v => v.id).filter(Boolean))
      ])
    )

    // Fast validation using Set operations
    const errors: string[] = []
    let validatedProducts = 0

    for (const [productId, existingVariantIds] of existingProductMap) {
      const providedVariants: Set<string> | undefined = providedVariantMap.get(productId)
      if (!providedVariants) continue

      const missingVariants = existingVariantIds.filter(
        existingId => !providedVariants.has(existingId)
      )

      validatedProducts++

      if (missingVariants.length > 0) {
        errors.push(`Product ${productId} is missing ${missingVariants.length} variant(s)`)
      }
    }

    if (errors.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Import failed: ${errors.length} product(s) have missing variants. All existing variants must be included in the CSV to prevent accidental deletion.`
      )
    }

    logger.info(`[Enhanced Import Variant Protection] ✅ Validated ${validatedProducts} products`)
    return new StepResponse({ status: 'validated', validatedProducts })
  }
)