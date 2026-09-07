import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"
import { MedusaContainer } from "@medusajs/framework"
import { MercurModules } from "@mercurjs/types"
import sellerProduct from "@mercurjs/core-plugin/links/product-seller-link"
import { PriceListImportEvents } from "../shared/events/price-list-import-events"
import { parsePriceListsFromCsv } from "../workflows/price-list/utils/parse-price-list-csv"
import { fetchDefaultRegionId } from "../workflows/price-list/utils/region-utils"
import { formatDuration } from "../shared/utils/date-utils"
import { FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX } from "../config/fixed-price-list"
import { processPriceLists } from "../shared/utils/price-list/process-price-lists"
import {
  PRICE_LIST_IMPORT_REQUEST_MODULE,
  PriceListImportRequestModuleService,
} from "../modules/price-list-import-request"

const SELLER_MODULE = MercurModules.SELLER

const SKU_CHUNK_SIZE = 100
const PRODUCT_CHUNK_SIZE = 200

type NotificationData = {
  to: string
  channel: string
  template: string
  redirectNotification?: string
}

export type PriceListImportBackgroundEventData = {
  transaction_id: string
  seller_id: string
  submitter_id: string
  file_name: string
  file_content: string
  notification?: NotificationData
}

async function validateSellerProductMapping(
  scope: MedusaContainer,
  skus: string[],
  seller_id: string
): Promise<void> {
  if (!skus.length) {
    throw new Error("No SKUs provided for validation")
  }
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  // Step 1: Fetch variants for SKUs in chunks (sku -> product_id)
  const allVariants: Array<{ id: string; sku: string; product_id: string }> = []
  const foundSkus = new Set<string>()
  const productIdsSet = new Set<string>()

  for (let i = 0; i < skus.length; i += SKU_CHUNK_SIZE) {
    const skuChunk = skus.slice(i, i + SKU_CHUNK_SIZE)
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "product_id"],
      filters: { sku: { $in: skuChunk }, deleted_at: { $eq: null } },
    })

    ;(variants || []).forEach((v: any) => {
      if (!v?.sku || !v?.id || !v?.product_id) return
      allVariants.push(v)
      foundSkus.add(v.sku)
      productIdsSet.add(v.product_id)
    })
  }

  if (allVariants.length === 0) {
    throw new Error(`No variants found for SKUs: ${skus.join(", ")}`)
  }

  const missingSkus = skus.filter((sku) => !foundSkus.has(sku))
  if (missingSkus.length) {
    throw new Error(`Variants not found for SKUs: ${missingSkus.join(", ")}`)
  }

  // Step 2: Fetch seller-product relationships in chunks (seller_id + product_ids)
  const productIds = [...productIdsSet]
  const validProductIds = new Set<string>()

  for (let i = 0; i < productIds.length; i += PRODUCT_CHUNK_SIZE) {
    const productChunk = productIds.slice(i, i + PRODUCT_CHUNK_SIZE)
    const { data: relations } = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: ["product_id"],
      filters: { seller_id, product_id: { $in: productChunk } },
    })
    ;(relations || []).forEach((r: any) => {
      if (r?.product_id) validProductIds.add(r.product_id)
    })
  }

  const invalidVariants = allVariants.filter((v) => !validProductIds.has(v.product_id))
  if (invalidVariants.length) {
    const invalidSkus = [...new Set(invalidVariants.map((v) => v.sku).filter(Boolean))]
    throw new Error(`The following SKUs do not belong to seller ${seller_id}: ${invalidSkus.join(", ")}.`)
  }
}

async function buildSkuToVariantMap(
  scope: MedusaContainer,
  skus: string[],
  regionId: string,
  chunkSize: number
): Promise<Map<string, { id: string; original_amount: number | null }>> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const map = new Map<string, { id: string; original_amount: number | null }>()

  for (let i = 0; i < skus.length; i += chunkSize) {
    const chunk = skus.slice(i, i + chunkSize)
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "calculated_price.original_amount"],
      filters: { sku: chunk },
      context: {
        calculated_price: QueryContext({
          region_id: regionId,
          currency_code: "inr",
        }),
      },
    })

    ;(variants || []).forEach((v: any) => {
      if (!v?.sku || !v?.id) return
      map.set(v.sku, {
        id: v.id,
        original_amount:
          typeof v?.calculated_price?.original_amount === "number"
            ? v.calculated_price.original_amount
            : null,
      })
    })
  }

  return map
}

export default async function priceListImportBackgroundSubscriber({
  event,
  container,
}: SubscriberArgs<PriceListImportBackgroundEventData>) {
  if (event.name !== PriceListImportEvents.PROCESS_BACKGROUND) {
    return
  }

  const {
    transaction_id,
    seller_id,
    submitter_id,
    file_name,
    file_content,
    notification,
  } = event.data

  const notificationService =
    container.resolve<INotificationModuleService>(Modules.NOTIFICATION)

  const startTime = Date.now()
  const notifyTo = notification?.to || seller_id
  const notifyChannel = notification?.channel || "seller_feed"
  const notifyTemplate = notification?.template || "vendor-ui"
  const redirect = notification?.redirectNotification || "/vendor/price-list/import"

  // ENV flag: if true → create request for admin approval; if false → direct insert
  const requireApproval = process.env.PRICE_LIST_IMPORT_REQUIRE_APPROVAL || false

  try {
    // 1) Parse CSV and group by date range
    const priceLists = parsePriceListsFromCsv({ fileContent: file_content, fileName: file_name })

    // 2) Extract unique SKUs
    const skuSet = new Set<string>()
    priceLists.forEach((pl) => (pl.prices || []).forEach((p: any) => p?.sku && skuSet.add(p.sku.trim())))
    const allSkus = [...skuSet].filter(Boolean)

    // 3) Validate seller-product mapping (strict, chunked)
    await validateSellerProductMapping(container as any, allSkus, seller_id)

    // 4) Get region id and fetch variant pricing in chunks
    const regionId = await fetchDefaultRegionId(container as any)
    const skuToVariant = await buildSkuToVariantMap(container as any, allSkus, regionId, SKU_CHUNK_SIZE)

    // 5) Strict validation pass over all rows — collect all errors, no insert yet
    const errors: string[] = []
    const processedPriceLists: Array<{
      data: any
      submitter_id: string
    }> = []

    for (const list of priceLists) {
      const processedPrices: any[] = []

      for (const price of list.prices) {
        const variant = skuToVariant.get(price.sku)
        const originalPrice = variant?.original_amount

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
          errors.push(`Invalid amount for SKU "${price.sku}": ${amount}. Amount cannot be negative.`)
          continue
        }

        if (percentage_discount !== null && percentage_discount !== undefined && percentage_discount < 0) {
          errors.push(
            `Invalid percentage discount for SKU "${price.sku}": ${percentage_discount}%. Percentage discount cannot be negative.`
          )
          continue
        }

        if ((amount == null || amount <= 0) && typeof percentage_discount === "number" && percentage_discount > 0) {
          amount = Math.round(originalPrice - (originalPrice * percentage_discount) / 100)
        }

        if (
          (percentage_discount == null || percentage_discount <= 0) &&
          typeof amount === "number" &&
          amount > 0
        ) {
          percentage_discount = Math.round(((originalPrice - amount) / originalPrice) * 100)
        }

        if (!amount || amount <= 0) {
          errors.push(`Invalid amount calculated for SKU "${price.sku}": ${amount}. Amount must be greater than 0.`)
          continue
        }

        if (amount > originalPrice) {
          errors.push(
            `Invalid amount for SKU "${price.sku}": ${amount}. Amount (${amount}) cannot be greater than original price (${originalPrice}).`
          )
          continue
        }

        if (percentage_discount !== null && percentage_discount !== undefined) {
          if (percentage_discount < 0) {
            errors.push(
              `Invalid percentage discount for SKU "${price.sku}": ${percentage_discount}%. Percentage discount cannot be negative.`
            )
            continue
          }
          if (percentage_discount > FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX) {
            errors.push(`Percentage discount too high for SKU "${price.sku}": ${percentage_discount}% (max ${FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX}%)`)
            continue
          }
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
          data: {
            ...list,
            prices: processedPrices,
          },
          submitter_id,
        })
      }
    }

    // If any validation errors → notify failure, do NOT insert anything
    if (errors.length > 0) {
      const formattedDuration = formatDuration(Date.now() - startTime)
      const topErrors = errors.slice(0, 50)
      const remaining = Math.max(0, errors.length - topErrors.length)

      await notificationService.createNotifications({
        to: notifyTo,
        channel: notifyChannel,
        template: notifyTemplate,
        content: { subject: "Price List Import Failed" },
        data: {
          title: "Import Failed",
          description:
            `Price list import failed after ${formattedDuration}. ` +
            `Found ${errors.length} validation error(s).` +
            (remaining ? ` Showing first ${topErrors.length}; ${remaining} more not shown.` : ""),
          transaction_id,
          errors: topErrors,
          redirect,
        },
      })
      return
    }

    // 6a) Request flow: save to DB for admin approval
    if (requireApproval) {
      const requestService = container.resolve<PriceListImportRequestModuleService>(
        PRICE_LIST_IMPORT_REQUEST_MODULE
      )

      const createdRequests: any[] = []
      const failedCreates: Array<{ title: string; error: string }> = []

      for (const payload of processedPriceLists) {
        try {
          const request = await requestService.createPriceListImportRequests({
            type: "price_list",
            data: payload.data,
            submitter_id,
            seller_id,
            file_name,
            transaction_id,
            status: "pending",
          })
          createdRequests.push(request)
        } catch (err: any) {
          failedCreates.push({
            title: payload.data?.title || "unknown",
            error: err?.message ?? String(err ?? "Unknown error"),
          })
        }
      }

      const formattedDuration = formatDuration(Date.now() - startTime)
      await notificationService.createNotifications({
        to: notifyTo,
        channel: notifyChannel,
        template: notifyTemplate,
        content: { subject: "Price List Import Pending Approval" },
        data: {
          title: "Import Pending Admin Approval",
          description:
            `Price list import of "${file_name}" validated in ${formattedDuration}. ` +
            `${createdRequests.length} price list(s) are pending admin approval.` +
            (failedCreates.length ? ` ${failedCreates.length} group(s) could not be queued.` : ""),
          transaction_id,
          pending_request_ids: createdRequests.map((r) => r.id).filter(Boolean),
          failed_groups: failedCreates.length ? failedCreates.slice(0, 25) : undefined,
          redirect,
        },
      })
      return
    }

    // 6b) Direct insert: all records validated — batch insert into price table
    await processPriceLists(
      container as any,
      processedPriceLists,
      seller_id,
      transaction_id,
      file_name,
      { to: notifyTo, channel: notifyChannel, template: notifyTemplate, redirect },
      startTime
    )
  } catch (error: any) {
    const formattedDuration = formatDuration(Date.now() - startTime)
    const errorMessage = error?.message || String(error || "Unknown error")

    await notificationService.createNotifications({
      to: notifyTo,
      channel: notifyChannel,
      template: notifyTemplate,
      content: { subject: "Price List Import Failed" },
      data: {
        title: "Import Failed",
        description: `Price list import failed after ${formattedDuration}: ${errorMessage}. Transaction ID: ${transaction_id}`,
        transaction_id,
        error_message: errorMessage,
        redirect,
      },
    })
  }
}

export const config: SubscriberConfig = {
  event: [PriceListImportEvents.PROCESS_BACKGROUND],
  context: { subscriberId: "price-list-import-processor" },
}
