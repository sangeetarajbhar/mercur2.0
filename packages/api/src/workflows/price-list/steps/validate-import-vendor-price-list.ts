import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { MedusaError, PriceListStatus } from "@medusajs/framework/utils"

import { VendorCreatePriceListImport } from "../../../api/vendor/price-list/validators"
import {
  validatePercentageDiscount,
  validatePriceValue,
} from "../../../api/utils/price-list-validation"

export const validateImportVendorPriceListStep = createStep(
  "validate-import-vendor-price-list",
  async (price_lists: unknown[]) => {
    const toCreate = price_lists.map((price_list: any, index) => {
      try {
        const originalPrices = price_list.prices || []
        const skuToVariantId = new Map<string, string>()
        originalPrices.forEach((price: { sku?: string; variant_id?: string }) => {
          if (price.sku && price.variant_id) {
            skuToVariantId.set(price.sku, price.variant_id)
          }
        })

        const parsed = VendorCreatePriceListImport.parse(price_list)

        if (parsed.prices && parsed.prices.length > 0) {
          parsed.prices.forEach((price: { sku?: string; variant_id?: string }) => {
            if (price.sku) {
              const variantId = skuToVariantId.get(price.sku)
              if (variantId) {
                price.variant_id = variantId
              }
            }
          })
        }

        if (parsed.prices && parsed.prices.length > 0) {
          parsed.prices.forEach((price: any) => {
            if (
              price.amount !== null &&
              price.amount !== undefined &&
              price.amount > 0
            ) {
              validatePriceValue(price.amount)
            }

            if (
              price.percentage_discount !== null &&
              price.percentage_discount !== undefined
            ) {
              validatePercentageDiscount(price.percentage_discount)
            }
          })
        }

        return {
          ...parsed,
          status: "active" as PriceListStatus,
        }
      } catch (error) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Price list validation failed at index ${index}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      }
    })

    return new StepResponse(toCreate)
  }
)
