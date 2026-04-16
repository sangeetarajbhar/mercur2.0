// import { z } from 'zod'

// import { ProductStatus } from '@medusajs/framework/utils'
// import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'


// /**
//  * Validates products to import and processes color and size fields as variant options
//  * If color and size are present in catalog template, they are treated as
//  * variant option 1 name and variant option 2 name respectively
//  * Enhanced to handle existing products by Handle - updates existing products instead of creating duplicates
//  */

// type Product = {
//   id: string;
//   handle: string;
//   // ...other fields you use
// };

// export const validateProductsToImportStep = createStep(
//   'validate-products-to-import',
//   async (products: unknown[], { container }) => {
//     const query = container.resolve("query")

//     // Process all products first to get validated products
//     const validatedProducts = products.map(product => {
//       const { processedProduct } = processProductVariantOptions(product)
//       // console.error('[DEBUG] processedProduct', JSON.stringify(processedProduct, null, 2))
//       return {
//         ...CreateProduct.extend({
//           status: z.string().optional()
//         }).parse(processedProduct),
//         status: processedProduct.status as ProductStatus,
//       }
//     })

//     // Batch query for existing products by handles
//     const handlesToCheck = validatedProducts
//       .map(p => p.handle)
//       .filter(handle => handle && handle.trim() !== '')

//     const existingProductsMap = new Map<string, Product>()

//     if (handlesToCheck.length > 0) {
//       try {
//         // Single batch query for all handles
//         const { data: existingProducts } = await query.graph({
//           entity: 'product',
//           fields: [
//             'id', 'handle', 'title', 'subtitle', 'description', 'status',
//             'thumbnail', 'images', 'weight', 'height', 'width', 'length',
//             'hs_code', 'origin_country', 'mid_code', 'material', 'metadata',
//             'discountable', 'variants.*', 'options.*'
//           ],
//           filters: {
//             handle: handlesToCheck
//           }
//         }) as { data: Product[] }

//         // Create map for quick lookup
//         existingProducts.forEach(product => {
//           existingProductsMap.set(product.handle, product)
//         })

//       } catch (error) {
//         console.error('Error batch checking for existing products:', error)
//       }
//     }

//     // Process results using the existing products map
//     const processedResults: any[] = []

//     for (const validatedProduct of validatedProducts) {
//       const existingProduct = validatedProduct.handle ? existingProductsMap.get(validatedProduct.handle) : null

//       if (existingProduct) {
//         // Merge with existing product, keeping existing values for empty CSV fields
//         const updatedProduct = mergeProductData(existingProduct, validatedProduct)
//         processedResults.push({
//           ...updatedProduct,
//           _isUpdate: true,
//           _existingId: existingProduct.id
//         })
//       } else {
//         // New product
//         processedResults.push({
//           ...validatedProduct,
//           _isUpdate: false
//         })
//       }
//     }

//     return new StepResponse(processedResults)
//   }
// )

// /**
//  * Merges existing product data with CSV data, preserving existing values when CSV fields are empty
//  * @param existingProduct - The existing product from the database
//  * @param csvProduct - The product data from CSV
//  * @returns Merged product data
//  */
// function mergeProductData(existingProduct: any, csvProduct: any): any {
//   const merged = { ...existingProduct }

//   // List of fields to merge from CSV, keeping existing values if CSV field is empty
//   const fieldsToMerge = [
//     'title', 'subtitle', 'description', 'status', 'thumbnail', 'images',
//     'weight', 'height', 'width', 'length', 'hs_code', 'origin_country',
//     'mid_code', 'material', 'discountable', 'brand', 'configuration'
//   ]

//   // Merge basic fields
//   fieldsToMerge.forEach(field => {
//     if (csvProduct[field] !== undefined && csvProduct[field] !== null && csvProduct[field] !== '') {
//       merged[field] = csvProduct[field]
//     }
//   })

//   // Handle metadata specially - merge objects
//   // if (csvProduct.metadata && typeof csvProduct.metadata === 'object') {
//   //   merged.metadata = {
//   //     ...(existingProduct.metadata || {}),
//   //     ...csvProduct.metadata
//   //   }
//   // }

//   if (csvProduct.metadata && typeof csvProduct.metadata === 'object') {
//     merged.metadata = { ...csvProduct.metadata }
//   } else {
//     // If CSV has no metadata, set to empty object to clear existing metadata
//     merged.metadata = {}
//   }

//   // // Handle metadata specially - merge objects
//   // if (csvProduct.metadata && typeof csvProduct.metadata === 'object') {
//   //   merged.metadata = {
//   //     ...(existingProduct.metadata || {}),
//   //     ...csvProduct.metadata
//   //   }
//   // }

//   // Handle metadata - replace entirely with CSV metadata (CSV is source of truth)
//   // This ensures no stale/invalid fields from previous imports are preserved
//   // System fields like _pending_images are already added from CSV during normalization
//   if (csvProduct.metadata && typeof csvProduct.metadata === 'object') {
//     merged.metadata = { ...csvProduct.metadata }
//   } else {
//     // If CSV has no metadata, set to empty object to clear existing metadata
//     merged.metadata = {}
//   }

//   // Handle variants - only include variants that need updating, not all existing variants
//   if (csvProduct.variants && csvProduct.variants.length > 0) {
//     merged.variants = mergeVariantsForUpdate(existingProduct.variants || [], csvProduct.variants)
//   }

//   // DO NOT update options for existing products - options are set at creation and should not be changed
//   // Changing options requires complex handling of variant option references
//   // Remove the options field entirely from the update payload
//   delete merged.options

//   // Preserve the handle from CSV (this is what we matched on)
//   merged.handle = csvProduct.handle

//   return merged
// }

// /**
//  * Merges existing variants with CSV variants for UPDATES ONLY
//  * Only returns variants that are being updated or created, not untouched existing variants
//  * @param existingVariants - Existing variants from database
//  * @param csvVariants - Variants from CSV
//  * @returns Array of variants to update/create (does not include untouched variants)
//  */
// function mergeVariantsForUpdate(existingVariants: any[], csvVariants: any[]): any[] {
//   const variantsToUpdate: any[] = []
//   const existingVariantMap = new Map<string, any>()

//   // Create a map of existing variants by SKU for quick lookup
//   existingVariants.forEach(variant => {
//     if (variant.sku) {
//       existingVariantMap.set(variant.sku, variant)
//     }
//   })

//   // Process CSV variants - only include variants that are actually in the CSV
//   csvVariants.forEach(csvVariant => {
//     if (csvVariant.sku && existingVariantMap.has(csvVariant.sku)) {
//       // Update existing variant - send only the fields we want to update
//       const existingVariant = existingVariantMap.get(csvVariant.sku)
//       const variantUpdate: any = {
//         id: existingVariant.id, // Must include ID for updates
//         sku: existingVariant.sku
//       }

//       // Only include fields that are being updated
//       if (csvVariant.title && csvVariant.title.trim() !== '') {
//         variantUpdate.title = csvVariant.title
//       }
//       if (csvVariant.prices && csvVariant.prices.length > 0) {
//         variantUpdate.prices = csvVariant.prices
//       }
//       if (csvVariant.metadata) {
//         variantUpdate.metadata = {
//           ...(existingVariant.metadata || {}),
//           ...csvVariant.metadata
//         }
//       }

//       // DO NOT include options for existing variants
//       // Medusa will keep the existing options as-is

//       variantsToUpdate.push(variantUpdate)
//     } else {
//       // New variant - include all fields including options
//       variantsToUpdate.push(csvVariant)
//     }
//   })

//   // DO NOT add remaining existing variants - Medusa will keep them as-is
//   // Only send variants that are explicitly being updated or created

//   return variantsToUpdate
// }

// /**
//  * Process product data to convert color and size fields into variant options
//  * @param product - The raw product data from CSV
//  * @returns Processed product with proper variant options structure
//  */
// function processProductVariantOptions(product: any): any {
//   // Create a clean processed product without unrecognized keys
//   const processedProduct: any = {}

//   // Copy only recognized fields
//   const recognizedFields = [
//     'brand', 'title', 'subtitle', 'description', 'handle', 'status',
//     'thumbnail', 'images', 'type_id', 'collection_id', 'tags',
//     'categories', 'options', 'variants', 'weight', 'height',
//     'width', 'length', 'hs_code', 'origin_country', 'mid_code',
//     'material', 'metadata', 'sales_channels', 'discountable',
//     // Ensure product attributes are included
//     'product_category_1', 'Number of Items', 'Variant Metadata',
//     // Product configuration fields
//     'configuration'
//   ]

//   recognizedFields.forEach(field => {
//     if (product[field] !== undefined) {
//       processedProduct[field] = product[field]
//     }
//   })


//   // let brand = null

//   // Map product brand to metadata if it exists
//   // if (product.brand) {
//   //   product.additional_data = {
//   //     brand_id: product.brand
//   const productVariants = product.variants || []

//   processedProduct.variants = productVariants.map((variant: any) => {
//     const optionValues = variant.options || {}
//     const sizeValue = optionValues["Size"] || null
//     const colorValue = optionValues["Color"] || null

//     return {
//       prices: [{ currency_code: 'inr', amount: variant.prices[0].amount }],
//       options: optionValues,
//       sku: variant.sku,
//       metadata: variant.metadata || {}
//     }
//   })


//   return { processedProduct }
// }

