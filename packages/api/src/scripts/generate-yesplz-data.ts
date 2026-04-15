import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { SEARCH_MODULE, SearchModuleService } from '../modules/search'
import { yesPlzProductTransformer } from '../modules/search/strategies/yesplz-strategies/yesplz-product-transformer'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Generate YesPlz data format for all products (without sending to API)
 * Useful for validation, testing, or exporting data
 * Usage: npx medusa exec ./src/scripts/generate-yesplz-data.ts [output-file.json]
 */
export default async function generateYesPlzData({ container, args }: ExecArgs) {
  
  // Check if YesPlz is enabled (optional check)
  const yesplzEnabled = process.env.YESPLZ_ENABLED === 'true'
  
  if (!yesplzEnabled) {
    console.warn('   Continuing anyway to generate data format...')
  }

  // Fetch all published products using Search Module (same as sync script)
  
  // Get all published product IDs first
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

  // Fetch and format products using Search Module (common logic)
  const searchService = container.resolve<SearchModuleService>(SEARCH_MODULE)
  const formattedProducts = await searchService.fetchProducts(container, productIds)
  
  if (formattedProducts.length === 0) {
    return
  }

  // Transform products to YesPlz format
  const yesplzProducts = yesPlzProductTransformer.transformBatch(formattedProducts)

  if (yesplzProducts.length === 0) {
    return
  }

  // Add random best_selling and trending values (same as before)
  const productsWithFlags = yesplzProducts.map(product => ({
    ...product,
    best_selling: Math.floor(Math.random() * 5) + 1, // Random number from 1 to 5
    trending: Math.floor(Math.random() * 5) + 1 // Random number from 1 to 5
  }))

  // Get output file path from args or use default
  const outputFile = args?.[0] || 'yesplz-products-data.json'
  const outputPath = path.resolve(process.cwd(), outputFile)

  // Write to file
  try {
    fs.writeFileSync(outputPath, JSON.stringify(productsWithFlags, null, 2), 'utf8')


    // Show statistics
    const withBestSelling = productsWithFlags.filter(p => p.best_selling).length
    const withTrending = productsWithFlags.filter(p => p.trending).length
    const withImages = productsWithFlags.filter(p => p.images?.length > 0).length
    const withInventory = productsWithFlags.filter(p => p.inventoryInfo?.length > 0).length

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return
  }

  return {
    success: true,
    total: productsWithFlags.length,
    outputFile: outputPath
  }
}
