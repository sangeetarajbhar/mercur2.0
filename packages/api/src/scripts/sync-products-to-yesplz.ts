import * as fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { SEARCH_MODULE, SearchModuleService, YesPlzSearchProvider } from '../modules/search'
import type { PublishProductError } from '../modules/search'

/** Number of product IDs to fetch and sync per batch (fetch + format + publish) */
const SYNC_BATCH_SIZE = parseInt(process.env.YESPLZ_SYNC_BATCH_SIZE || '50', 10)

function truncateForExcel(value: string, maxChars = 30000): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}...TRUNCATED`
}

/**
 * Write sync errors to an Excel file and dump full payload JSON to disk.
 * Excel includes a truncated payload column plus a path to the full payload file.
 */
function writeErrorReport(errors: PublishProductError[]): { excelPath: string; payloadDir: string } {
  const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const payloadDir = path.join(process.cwd(), `yesplz-sync-error-payloads-${runId}`)
  fs.mkdirSync(payloadDir, { recursive: true })

  const header: [string, string, string, string, string, string, string, string] = [
    'Product ID',
    'Error',
    'Timestamp',
    'Sizes',
    'InventoryInfo Count',
    'Duplicate Size Labels',
    'Payload File',
    'Payload (truncated)',
  ]

  const rows: Array<[string, string, string, string, string, string, string, string]> = [header]

  errors.forEach((e, idx) => {
    const safeProductId = (e.productId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')
    const payloadFile = path.join(payloadDir, `${safeProductId}-${idx + 1}.json`)

    // Store full payload + debug info
    fs.writeFileSync(
      payloadFile,
      JSON.stringify(
        {
          productId: e.productId,
          error: e.error,
          timestamp: e.timestamp,
          sizes: e.sizes,
          inventoryInfoCount: e.inventoryInfoCount,
          duplicateSizeLabels: e.duplicateSizeLabels,
          skuIds: e.skuIds,
          payload: e.payload,
        },
        null,
        2
      ),
      'utf8'
    )

    const payloadJson = JSON.stringify(e.payload)
    rows.push([
      e.productId,
      e.error,
      e.timestamp,
      e.sizes ?? '',
      String(e.inventoryInfoCount ?? ''),
      (e.duplicateSizeLabels ?? []).join(', '),
      payloadFile,
      truncateForExcel(payloadJson),
    ])
  })

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Errors')

  const excelPath = path.join(process.cwd(), `yesplz-sync-errors-${runId}.xlsx`)
  XLSX.writeFile(workbook, excelPath)

  return { excelPath, payloadDir }
}

/**
 * Bulk sync script to sync all products to YesPlz in batches.
 * Usage: npx medusa exec ./src/scripts/sync-products-to-yesplz.ts
 * Optional: YESPLZ_SYNC_BATCH_SIZE (default 50) controls how many products per batch.
 */
export default async function syncProductsToYesPlz({ container }: ExecArgs) {

  const yesplzOptions = {
    apiUrl: process.env.YESPLZ_API_URL || 'https://api-staging.yesplz.ai',
    webhookSecret: process.env.YESPLZ_WEBHOOK_SECRET || '',
    rateLimit: parseInt(process.env.YESPLZ_RATE_LIMIT || '100', 10),
    retryAttempts: parseInt(process.env.YESPLZ_RETRY_ATTEMPTS || '3', 10),
    timeout: parseInt(process.env.YESPLZ_TIMEOUT || '30000', 10)
  }

  if (!yesplzOptions.apiUrl || !yesplzOptions.webhookSecret) {
    return
  }

  const searchService = container.resolve<SearchModuleService>(SEARCH_MODULE)
  const yesplzProvider = new YesPlzSearchProvider(container, yesplzOptions)

  if (!yesplzProvider.isEnabled()) {
    return
  }

  console.log('Checking YesPlz API health...')

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: allProducts } = await query.graph({
    entity: 'product',
    fields: ['id'],
    filters: { status: 'published', deleted_at: null }
  })

  const productIds = allProducts?.map((p: { id: string }) => p.id) || []

  if (productIds.length === 0) {
    return
  }

  const totalBatches = Math.ceil(productIds.length / SYNC_BATCH_SIZE)

  const allErrors: PublishProductError[] = []
  let totalSynced = 0

  for (let i = 0; i < productIds.length; i += SYNC_BATCH_SIZE) {
    const batchIds = productIds.slice(i, i + SYNC_BATCH_SIZE)
    const batchNum = Math.floor(i / SYNC_BATCH_SIZE) + 1

    const formattedProducts = await searchService.fetchProducts(container, batchIds)
    if (formattedProducts.length === 0) continue

    const { successCount, errors } = await yesplzProvider.publishProductAndCollectErrors(formattedProducts)
    totalSynced += successCount
    allErrors.push(...errors)
  }

  let errorsFilePath: string | undefined
  let payloadDirPath: string | undefined
  if (allErrors.length > 0) {
    const report = writeErrorReport(allErrors)
    errorsFilePath = report.excelPath
    payloadDirPath = report.payloadDir
  }

  return {
    success: true,
    total: totalSynced,
    failed: allErrors.length,
    errorsFile: errorsFilePath,
    payloadDir: payloadDirPath
  }
}

