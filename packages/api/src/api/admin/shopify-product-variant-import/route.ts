import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { parse } from "csv-parse/sync"

import { SHOPIFY_PRODUCT_VARIANTS_MODULE } from "../../../modules/shopify_product_variant"
import type ShopifyProductVariantsModuleService from "../../../modules/shopify_product_variant/service"

type CsvRow = {
  "Medusa_Product Id"?: string
  "SKU Code"?: string
  "Shopify Product ID"?: string
  "Shopify Variant ID"?: string
  [key: string]: unknown
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const file = (req as AuthenticatedMedusaRequest & {
    file?: { buffer: Buffer; originalname?: string }
  }).file

  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No CSV file uploaded. Expected columns: Medusa_Product Id, SKU Code, Shopify Product ID."
    )
  }

  const service = req.scope.resolve<ShopifyProductVariantsModuleService>(
    SHOPIFY_PRODUCT_VARIANTS_MODULE
  )

  const BATCH_SIZE = 500
  let totalRows = 0
  let normalizedRows = 0
  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0
  let invalidCount = 0

  const processBatch = async (
    batch: Map<string, { shopify_product_id: string; shopify_variant_id: string }>
  ) => {
    if (!batch.size) return

    const skus = Array.from(batch.keys())

    const existing = await service.listShopifyProductVariants(
      { sku: skus },
      { take: skus.length }
    )

    const existingBySku = new Map<string, any>()
    for (const record of existing as any[]) {
      if (record.sku) existingBySku.set(record.sku, record)
    }

    const toCreate: { sku: string; shopify_product_id: string; shopify_variant_id: string }[] = []
    const toUpdate: { id: string; shopify_product_id: string; shopify_variant_id: string }[] = []

    for (const [sku, payload] of batch.entries()) {
      const current = existingBySku.get(sku)
      const { shopify_product_id, shopify_variant_id } = payload

      if (!current) {
        toCreate.push({ sku, shopify_product_id, shopify_variant_id })
        continue
      }

      if (
        current.shopify_variant_id === shopify_variant_id &&
        current.shopify_product_id === shopify_product_id
      ) {
        skippedCount++
        continue
      }

      toUpdate.push({
        id: current.id,
        shopify_product_id,
        shopify_variant_id,
      })
    }

    const CHUNK_SIZE = 100

    if (toCreate.length) {
      for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
        const slice = toCreate.slice(i, i + CHUNK_SIZE)
        const created = await service.createShopifyProductVariants(slice as any)
        createdCount += Array.isArray(created) ? created.length : slice.length
      }
    }

    if (toUpdate.length) {
      for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
        const slice = toUpdate.slice(i, i + CHUNK_SIZE)
        const updated = await service.updateShopifyProductVariants(slice as any)
        updatedCount += Array.isArray(updated) ? updated.length : slice.length
      }
    }
  }

  let records: CsvRow[]
  try {
    const content = file.buffer.toString("utf-8")
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CsvRow[]
  } catch (err: any) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to parse CSV: ${err.message ?? String(err)}`
    )
  }

  const skuMap = new Map<
    string,
    { shopify_product_id: string; shopify_variant_id: string }
  >()

  if (!records.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "CSV contained no data rows.")
  }

  const sample = records[0]
  const requiredHeaders: Array<keyof CsvRow> = [
    "SKU Code",
    "Shopify Product ID",
    "Shopify Variant ID",
  ]
  const missingHeaders = requiredHeaders.filter((h) => !(h in sample))
  if (missingHeaders.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `CSV is missing required column(s): ${missingHeaders.join(", ")}. Expected at least: "SKU Code", "Shopify Product ID".`
    )
  }

  for (const record of records) {
    totalRows++

    const rawSku = (record["SKU Code"] ?? "") as string
    const rawShopifyProductId = (record["Shopify Product ID"] ?? "") as string
    const rawShopifyVariantId = (record["Shopify Variant ID"] ?? "") as string

    const sku = rawSku?.toString().trim()
    const shopify_product_id = rawShopifyProductId?.toString().trim()
    const shopify_variant_id = rawShopifyVariantId?.toString().trim()

    if (!sku || !shopify_product_id || !shopify_variant_id) {
      invalidCount++
      continue
    }

    skuMap.set(sku, { shopify_product_id, shopify_variant_id })
  }

  const entries: Array<
    [string, { shopify_product_id: string; shopify_variant_id: string }]
  > = Array.from(skuMap.entries())

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const slice = entries.slice(i, i + BATCH_SIZE)
    const batchMap = new Map<
      string,
      { shopify_product_id: string; shopify_variant_id: string }
    >(slice)

    await processBatch(batchMap)
    normalizedRows += batchMap.size
  }

  return res.status(200).json({
    processed: totalRows,
    normalized_rows: normalizedRows,
    created: createdCount,
    updated: updatedCount,
    skipped: skippedCount,
    invalid_rows: invalidCount,
  })
}

