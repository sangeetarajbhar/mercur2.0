import { Modules, QueryContext } from "@medusajs/framework/utils"
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"

import { MercurModules } from "@mercurjs/types"
const SELLER_MODULE = MercurModules.SELLER

import { ExtendedCreatePriceListWorkflowInputDTO } from "./create-custom-price-lists"
import { createCustomPriceListsWorkflow } from "./create-custom-price-lists"
import {
  createPriceListImportSuccessNotificationStep,
  parsePriceListCsvStep,
  validateImportVendorPriceListStep,
  validateSellerProductMappingStep,
} from "../steps"

export const importVendorPriceListsWorkflow = createWorkflow(
  "import-vendor-price-lists",
  function (input: {
    file_content: string
    file_name: string
    seller_id: string
    submitter_id: string
  }) {
    const price_list = parsePriceListCsvStep({
      fileContent: input.file_content,
      fileName: input.file_name,
    })

    const skus = transform({ price_list }, ({ price_list }) => {
      return [...new Set(price_list.flatMap((list) => list.prices.map((p) => p.sku)))]
    })

    const regionQuery = useQueryGraphStep({
      entity: "region",
      fields: ["id"],
      pagination: { take: 1 },
    }).config({ name: "get-single-region-value" })
    const regions = regionQuery.data as Array<{ id: string }>
    const regionId = transform({ regions }, ({ regions }) => regions[0]?.id)

    const variantQuery = useQueryGraphStep({
      entity: "variant",
      fields: ["id", "sku", "calculated_price.original_amount"],
      filters: { sku: skus },
      context: {
        calculated_price: QueryContext({
          region_id: regionId,
          currency_code: "inr",
        }),
      },
    })
    type VariantWithCalculatedPrice = {
      id: string
      sku: string
      calculated_price?: {
        original_amount?: number | null
      } | null
    }
    const variants = variantQuery.data as VariantWithCalculatedPrice[]

    const priceListsWithVariantIds = transform(
      { price_list, variants, regionId },
      ({ price_list, variants, regionId }) => {
        const skuToVariant = Object.fromEntries(
          variants.map((v) => [
            v.sku,
            { id: v.id, original_price: v.calculated_price?.original_amount },
          ])
        )

        const processedPriceLists: any[] = []
        const errors: string[] = []

        for (const list of price_list) {
          const processedPrices: any[] = []
          for (const price of list.prices) {
            const variant = skuToVariant[price.sku]
            const originalPrice = variant?.original_price

            if (!variant) {
              errors.push(`SKU "${price.sku}" not found in system`)
              continue
            }
            if (typeof originalPrice !== "number" || originalPrice <= 0) {
              errors.push(`No valid original price found for SKU "${price.sku}"`)
              continue
            }

            let amount = price.amount
            let percentage_discount = price.percentage_discount

            if (amount !== null && amount !== undefined && amount < 0) {
              errors.push(
                `Invalid amount for SKU "${price.sku}": ${amount}. Amount cannot be negative.`
              )
              continue
            }
            if (
              percentage_discount !== null &&
              percentage_discount !== undefined &&
              percentage_discount < 0
            ) {
              errors.push(
                `Invalid percentage discount for SKU "${price.sku}": ${percentage_discount}%. Percentage discount cannot be negative.`
              )
              continue
            }

            if (
              (amount == null || amount <= 0) &&
              typeof percentage_discount === "number" &&
              percentage_discount > 0
            ) {
              amount = Math.round(
                originalPrice - (originalPrice * percentage_discount) / 100
              )
            }
            if (
              (percentage_discount == null || percentage_discount <= 0) &&
              typeof amount === "number" &&
              amount > 0
            ) {
              percentage_discount = Math.round(
                ((originalPrice - amount) / originalPrice) * 100
              )
            }

            if (!amount || amount <= 0) {
              errors.push(
                `Invalid amount calculated for SKU "${price.sku}": ${amount}. Amount must be greater than 0.`
              )
              continue
            }
            if (amount > originalPrice) {
              errors.push(
                `Invalid amount for SKU "${price.sku}": ${amount}. Amount (${amount}) cannot be greater than original price (${originalPrice}).`
              )
              continue
            }

            // 90% cap requirement
            if (
              percentage_discount !== null &&
              percentage_discount !== undefined &&
              percentage_discount > 90
            ) {
              errors.push(
                `Percentage discount too high for SKU "${price.sku}": ${percentage_discount}% (max 90%)`
              )
              continue
            }

            processedPrices.push({
              ...price,
              variant_id: variant.id,
              amount,
              percentage_discount,
              rules: { region_id: regionId },
            })
          }

          if (processedPrices.length === 0 && list.prices.length > 0) {
            errors.push(`No valid prices found for price list "${list.title}"`)
          }
          if (processedPrices.length > 0) {
            processedPriceLists.push({
              ...list,
              prices: processedPrices,
            })
          }
        }

        if (errors.length > 0) {
          throw new Error(`Price list validation failed:\n${errors.join("\n")}`)
        }
        return processedPriceLists
      }
    )

    const allSkus = transform(
      { priceListsWithVariantIds },
      ({ priceListsWithVariantIds }) => {
        const skuSet = new Set<string>()
        priceListsWithVariantIds.forEach((priceList: any) => {
          if (priceList.prices) {
            priceList.prices.forEach((price: any) => {
              if (price.sku && price.sku.trim()) {
                skuSet.add(price.sku.trim())
              }
            })
          }
        })
        return Array.from(skuSet)
      }
    )

    validateSellerProductMappingStep({
      skus: allSkus,
      seller_id: input.seller_id,
    })

    const batchCreate = validateImportVendorPriceListStep(priceListsWithVariantIds)

    // Request/approval flow intentionally removed for 2.0.
    // Kept as comment for traceability:
    // - create request records in request table
    // - link seller <-> request
    // - wait for admin approval

    const created = createCustomPriceListsWorkflow.runAsStep({
      input: {
        price_lists_data: batchCreate as ExtendedCreatePriceListWorkflowInputDTO[],
      },
    })

    const link = transform({ created, input }, ({ created, input }) => {
      return created.map(({ id }) => ({
        [Modules.PRICING]: {
          price_list_id: id,
        },
        [SELLER_MODULE]: {
          seller_id: input.seller_id,
        },
      }))
    })
    createRemoteLinkStep(link).config({ name: "create-remote-links-direct-import" })

    const notificationPayload = transform(
      { created, input },
      ({ created, input }) => ({
        seller_id: input.seller_id,
        file_name: input.file_name,
        count: created.length,
      })
    )
    createPriceListImportSuccessNotificationStep(notificationPayload)

    return new WorkflowResponse(created)
  }
)
