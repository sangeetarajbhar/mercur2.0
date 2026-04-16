// import {
//   // batchLinkProductsToCategoryWorkflow,
//   createProductsWorkflow,
//   // updateProductsWorkflow,  // Mapping Custom Code
//   useQueryGraphStep,
//   // parseProductCsvStep
// } from '@medusajs/medusa/core-flows'
// import {
//   ContainerRegistrationKeys,
//   toHandle,
//   MedusaError
// } from '@medusajs/framework/utils'
// import {
//   WorkflowResponse,
//   createWorkflow,
//   transform,
//   createStep,
//   StepResponse,
// } from '@medusajs/framework/workflows-sdk'

// import { ProductRequestUpdatedEvent, RequestStatus } from '../../../types/request'
// import { REQUESTS_MODULE } from '../../../modules/req'
// import { SELLER_MODULE } from '../../../modules/seller'

// import { emitMultipleEventsStep } from '../../common/steps'
// import { createRequestStep } from '../../requests/steps'
// import { validateProductsToImportStep } from '../steps'
// import { parseProductCsvStep } from '../steps/parse-product-csv'
// import { Modules } from '@medusajs/framework/utils'
// import { BRAND_MODULE } from '@mercurjs/brand'
// import { PRODUCT_CONFIGURATION_MODULE } from '../../../modules/product-configuration'
// import ProductConfigurationService from '../../../modules/product-configuration/service'
// import { processProductImagesStep } from '../steps/process-product-images'
// import SellerBrandLink from '../../../links/seller-brand'
// import SellerProductLink from '../../../links/seller-product'
// import { updateProductsWorkflow } from '../../product/workflows'

// export const processProductConfigurationStep = createStep(
//   "process-product-configuration",
//   async (
//     { created, productsWithBrandId }: { created: any[]; productsWithBrandId: any[] },
//     { container }
//   ) => {
//     try {
//       // console.error('[DEBUG] ---------------------------------------', JSON.stringify(productsWithBrandId, null, 2))
//       const productConfigService = container.resolve(PRODUCT_CONFIGURATION_MODULE) as ProductConfigurationService
//       const link = container.resolve("link")

//       // Process products in batches to avoid overwhelming the connection pool
//       const BATCH_SIZE = 10
//       const productBatches: Array<{ created: any[]; original: any[] }> = []
//       for (let i = 0; i < created.length; i += BATCH_SIZE) {
//         productBatches.push({
//           created: created.slice(i, i + BATCH_SIZE),
//           original: productsWithBrandId.slice(i, i + BATCH_SIZE)
//         })
//       }

//       // Process each batch sequentially with parallel processing within batches
//       for (let batchIndex = 0; batchIndex < productBatches.length; batchIndex++) {
//         const batch = productBatches[batchIndex]

//         // Process products in current batch in parallel
//         await Promise.all(batch.created.map(async (createdProduct, i) => {
//           const originalProduct = batch.original[i]

//           try {
//             // Check if product has configuration data
//             if (originalProduct['configuration']) {
//               const configData = originalProduct['configuration']

//               // Convert returnable_days to number (service handles validation)
//               const returnableDaysNum =
//                 configData.returnable_days === undefined || configData.returnable_days === null
//                   ? 0
//                   : Number(configData.returnable_days)

//               // Check if this is an update (product already existed)
//               const isUpdate = originalProduct._isUpdate

//               if (isUpdate) {
//                 // For updates, find existing product configuration and update it
//                 try {
//                   // Find existing product configuration link
//                   const existingLinks = await link.list({
//                     [Modules.PRODUCT]: { product_id: createdProduct.id },
//                     [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: { $ne: null } }
//                   })

//                   if (existingLinks && existingLinks.length > 0) {
//                     const existingLink = existingLinks[0] as any
//                     const existingConfigId = existingLink.product_configuration_id

//                     // Update existing product configuration by ID
//                     await productConfigService.updateProductConfigurations(
//                       { id: existingConfigId },
//                       {
//                         is_returnable: configData.is_returnable || false,
//                         is_exchangeable: configData.is_exchangeable || false,
//                         is_try_and_buy: configData.is_try_and_buy || false,
//                         returnable_days: returnableDaysNum
//                       }
//                     )
//                   } else {
//                     // No existing configuration found, create a new one
//                     const productConfigResult = await productConfigService.createProductConfigurations({
//                       is_returnable: configData.is_returnable || false,
//                       is_exchangeable: configData.is_exchangeable || false,
//                       is_try_and_buy: configData.is_try_and_buy || false,
//                       returnable_days: returnableDaysNum
//                     })

//                     // Handle both single object and array returns (though single object is expected)
//                     const productConfig = Array.isArray(productConfigResult) ? productConfigResult[0] : productConfigResult

//                     // Link product configuration to product
//                     await link.create({
//                       [Modules.PRODUCT]: { product_id: createdProduct.id },
//                       [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: productConfig.id },
//                     })
//                   }
//                 } catch (updateError) {
//                   console.error(`Error updating product configuration for product ${createdProduct.id}:`, updateError)
//                 }
//               } else {
//                 // For new products, create product configuration as before
//                 const productConfigResult = await productConfigService.createProductConfigurations({
//                   is_returnable: configData.is_returnable || false,
//                   is_exchangeable: configData.is_exchangeable || false,
//                   is_try_and_buy: configData.is_try_and_buy || false,
//                   returnable_days: returnableDaysNum
//                 })

//                 // Handle both single object and array returns (though single object is expected)
//                 const productConfig = Array.isArray(productConfigResult) ? productConfigResult[0] : productConfigResult

//                 // Link product configuration to product
//                 await link.create({
//                   [Modules.PRODUCT]: { product_id: createdProduct.id },
//                   [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: productConfig.id },
//                 })
//               }
//             }
//           } catch (error) {
//             console.error(`Error processing configuration for product ${createdProduct.id}:`, error)
//             // Continue with next product instead of failing entire batch
//           }
//         }))

//         // Small delay between batches to prevent connection pool exhaustion
//         if (batchIndex < productBatches.length - 1) {
//           await new Promise(resolve => setTimeout(resolve, 50)) // Reduced delay for faster processing
//         }
//       }
//     } catch (error) {
//       console.error('Error processing product configuration:', error)
//     }
//     return new StepResponse(created)
//   }
// )

// export const processAttributesStep = createStep(
//   "process-attributes",
//   async (
//     { created, productsWithBrandId }: { created: any[]; productsWithBrandId: any[] },
//     { container }
//   ) => {
//     try {

//       // console.log('processAttributesStep')
//       // Extract category IDs
//       const categoryIds = new Set<string>()
//       for (const product of productsWithBrandId) {
//         if (product.categories) {
//           categoryIds.add(product.categories[0].id)
//         }
//       }

//       // Dynamically get attribute fields from metadata keys
//       const allMetadataFields = Object.keys(productsWithBrandId[0]?.metadata || {})

//       // console.log('allMetadataFields', allMetadataFields) 
//       // console.log('productsWithBrandId', productsWithBrandId)

//       // Fields to exclude from attribute processing (internal/system fields) except shipping_profile_id for update 
//       const excludedFields = new Set(['_pending_images', 'shipping_profile_id'])

//       // Filter out invalid field names (empty, whitespace-only, or containing only special characters)
//       const csvAttributeFields = allMetadataFields.filter(fieldName => {
//         // Skip excluded/internal fields
//         if (excludedFields.has(fieldName)) return false

//         // Skip fields starting with underscore (internal fields)
//         if (fieldName.startsWith('_')) return false

//         if (!fieldName || typeof fieldName !== 'string') return false

//         // Clean the field name of carriage returns, newlines, and extra whitespace
//         const cleanedName = fieldName.trim().replace(/[\r\n]/g, '')

//         // Skip if empty after cleaning
//         if (!cleanedName) return false

//         // Generate handle and skip if it becomes invalid
//         const handle = toHandle(cleanedName)

//         // Skip if handle is empty, just dashes, or too short
//         if (!handle || handle === '-' || handle.length < 2) {
//           console.warn(`Skipping invalid field name: "${fieldName}" (cleaned: "${cleanedName}", handle: "${handle}")`)
//           return false
//         }

//         return true
//       })

//       // console.log('csvAttributeFields', csvAttributeFields)

//       // Batch fetch all unique attribute handles first
//       const allAttributeHandles = new Set<string>()
//       for (const product of productsWithBrandId) {
//         for (const fieldName of csvAttributeFields) {
//           // Skip excluded fields
//           if (excludedFields.has(fieldName) || fieldName.startsWith('_')) continue

//           const fieldValue = product?.metadata?.[fieldName]
//           if (fieldValue && fieldValue !== "") {
//             const cleanedFieldName = fieldName.trim().replace(/[\r\n]/g, '')
//             const attributeHandle = toHandle(cleanedFieldName)
//             allAttributeHandles.add(attributeHandle)
//           }
//         }
//       }

//       // console.log('allAttributeHandles', allAttributeHandles)

//       // Single batch query for all attributes
//       const attributesMap = new Map<string, any>()
//       if (allAttributeHandles.size > 0) {
//         try {
//           const { data: attributes } = await container.resolve("query").graph({
//             entity: 'attribute',
//             fields: ['id', 'name', 'handle', 'possible_values.*'],
//             filters: {
//               handle: Array.from(allAttributeHandles)
//             }
//           }).catch(() => ({ data: [] }))

//           attributes.forEach(attr => {
//             attributesMap.set(attr.handle, attr)
//           })
//         } catch (error) {
//           console.error('Error batch loading attributes:', error)
//           throw error
//         }
//       }

//       // console.log('attributesMap', attributesMap)

//       // Process products in batches to avoid overwhelming the connection pool
//       const BATCH_SIZE = 10 // Set to 10 as requested
//       const productBatches: Array<{ created: any[]; original: any[] }> = []
//       for (let i = 0; i < created.length; i += BATCH_SIZE) {
//         productBatches.push({
//           created: created.slice(i, i + BATCH_SIZE),
//           original: productsWithBrandId.slice(i, i + BATCH_SIZE)
//         })
//       }


//       // Process each batch sequentially with parallel processing within batches
//       for (let batchIndex = 0; batchIndex < productBatches.length; batchIndex++) {
//         const batch = productBatches[batchIndex]

//         // Process products in current batch in parallel
//         await Promise.all(batch.created.map(async (createdProduct, i) => {
//           const originalProduct = batch.original[i]
//           const attributeValues: Array<{ attribute_id: string; value: string }> = []

//           // console.log('csvAttributeFields', csvAttributeFields)

//           try {
//             for (const fieldName of csvAttributeFields) {
//               const fieldValue = originalProduct?.metadata?.[fieldName]

//               if (fieldValue && fieldValue !== "") {
//                 const attributeValue = String(fieldValue)
//                 const cleanedFieldName = fieldName.trim().replace(/[\r\n]/g, '')
//                 const attributeHandle = toHandle(cleanedFieldName)

//                 // Use pre-loaded attribute from map
//                 const attribute = attributesMap.get(attributeHandle)

//                 // Validate attribute existence
//                 if (!attribute || !attribute.id) {
//                   throw new Error(
//                     `Attribute '${cleanedFieldName}' (handle: ${attributeHandle}) does not exist or is invalid.`
//                   )
//                 }

//                 const existingValues = (attribute.possible_values || []).map(v => v.value)

//                 if (existingValues.length > 0) {
//                   // Validate value existence in possible_values
//                   const normalizedExistingValues = existingValues.map(v =>
//                     String(v).trim().toLowerCase()
//                   )
//                   const normalizedAttributeValue = String(attributeValue).trim().toLowerCase()

//                   const exactMatch = existingValues
//                     .map(v => String(v).trim())
//                     .includes(String(attributeValue).trim())
//                   const caseInsensitiveMatch = normalizedExistingValues.includes(
//                     normalizedAttributeValue
//                   )

//                   if (!exactMatch && !caseInsensitiveMatch) {
//                     throw new Error(
//                       `Value '${attributeValue}' for attribute '${attribute.name}' is not in possible values: [${existingValues.join(", ")}]`
//                     )
//                   }

//                   // Use the exact stored value for consistency
//                   let valueToStore = attributeValue
//                   if (exactMatch) {
//                     valueToStore =
//                       existingValues.find(
//                         v => String(v).trim() === String(attributeValue).trim()
//                       ) || attributeValue
//                   } else if (caseInsensitiveMatch) {
//                     valueToStore =
//                       existingValues.find(
//                         v => String(v).trim().toLowerCase() === normalizedAttributeValue
//                       ) || attributeValue
//                   }

//                   attributeValues.push({ attribute_id: attribute.id, value: valueToStore })
//                 } else {
//                   // No possible_values → directly add the CSV value
//                   attributeValues.push({ attribute_id: attribute.id, value: attributeValue })
//                 }
//               }
//             }

//             // Store attribute values for batch processing
//             if (attributeValues.length > 0) {
//               createdProduct._attributeValues = attributeValues
//             }
//           } catch (error) {
//             console.error(`Error processing attributes for product ${createdProduct.id}:`, error)
//             throw error
//           }
//         }))

//         // Collect products that need attribute updates from this batch
//         const productsToUpdate = batch.created.filter(product => product._attributeValues && product._attributeValues.length > 0)

//         if (productsToUpdate.length > 0) {
//           try {
//             // Batch update all products in this batch with their attributes
//             // console.log('productsToUpdate', productsToUpdate.map(product => product.id))
//             const updatePromises = productsToUpdate.map(product =>
//               updateProductsWorkflow(container).run({
//                 input: {
//                   selector: { id: product.id },
//                   update: {},
//                   additional_data: { values: product._attributeValues },
//                 },
//               })
//             )

//             await Promise.all(updatePromises)

//             // Clear metadata after successful attribute update, but preserve internal fields
//             const productService = container.resolve(Modules.PRODUCT)
//             const metadataClearPromises = productsToUpdate.map(async (product) => {
//               // Get current metadata to preserve internal fields
//               const currentProduct = await productService.retrieveProduct(product.id)
//               const currentMetadata = currentProduct.metadata || {}

//               // Preserve internal fields (starting with _)
//               const preservedMetadata: Record<string, unknown> = {}
//               Object.keys(currentMetadata).forEach(key => {
//                 if (key.startsWith('_')) {
//                   preservedMetadata[key] = currentMetadata[key]
//                 }
//               })

//               return productService.updateProducts(product.id, { metadata: preservedMetadata })
//             })
//             await Promise.all(metadataClearPromises)

//           } catch (error) {
//             console.error(`Error updating attributes for batch ${batchIndex + 1}:`, error)
//             throw error
//           }
//         }

//         // Small delay between batches to prevent connection pool exhaustion
//         if (batchIndex < productBatches.length - 1) {
//           await new Promise(resolve => setTimeout(resolve, 50)) // Reduced delay for faster processing
//         }
//       }
//     } catch (error) {
//       console.error("Error validating CSV attributes:", error)
//       throw error // rethrow so workflow fails
//     }
//     return new StepResponse(created)
//   }
// )

// export const processMRPAndCreatePriceListStep = createStep(
//   "process-mrp-and-create-price-list",
//   async (
//     input: {
//       created: any[];
//       productsWithBrandId: any[];
//       seller_id: string
//     },
//     { container }
//   ) => {
//     const { created, seller_id } = input
//     try {

//       // Get pricing service
//       const pricingService = container.resolve(Modules.PRICING)

//       // Create a price list using the pricing service
//       const [priceList] = await pricingService.createPriceLists([{
//         title: `Seller ${seller_id} - Import Price List ${new Date().toISOString()}`,
//         description: `Auto-generated price list for seller ${seller_id}`,
//         type: "sale",
//         status: "active"
//       }])

//       // Update existing price records to link to the new price list
//       const variantIds: any[] = []
//       for (let i = 0; i < created.length; i++) {
//         const createdProduct = created[i]

//         if (createdProduct.variants && createdProduct.variants.length > 0) {
//           for (const variant of createdProduct.variants) {
//             // Each variant can have multiple price entries
//             if (variant.prices && variant.prices.length > 0) {
//               const basePrice = variant.prices[0].amount // or find INR by currency_code

//               if (basePrice && !isNaN(basePrice)) {
//                 variantIds.push(variant.id)
//               }
//             } else {
//               console.warn(`Variant ${variant.id} has no price records`)
//             }
//           }
//         }
//       }

//       // Get knex for database operations
//       const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

//       // Update existing price records to link them to the new price list
//       if (variantIds.length > 0) {
//         const priceSetsVariant = await knex("product_variant_price_set").whereIn("variant_id", variantIds)
//         await knex("price")
//           .whereIn("price_set_id", priceSetsVariant.map((priceSet) => priceSet.price_set_id))
//           .update({
//             price_list_id: priceList.id,
//             updated_at: new Date()
//           })
//       }

//       // Create mapping in seller_seller_pricing_price_list table
//       const link = container.resolve("link")
//       await link.create({
//         [SELLER_MODULE]: { seller_id: seller_id },
//         [Modules.PRICING]: { price_list_id: priceList.id },
//       })

//       return new StepResponse(created)

//     } catch (error) {
//       console.error('Error processing MRP and creating price list:', error)
//       // Don't throw error to prevent workflow failure, just log it
//       return new StepResponse(created)
//     }
//   }
// )

// export const validateSellerBrandsStep = createStep(
//   "validate-seller-brands",
//   async (
//     { brands, seller_id }: { brands: any[]; seller_id: string },
//     { container }
//   ) => {
//     try {
//       const query = container.resolve("query")

//       // Get all brands associated with this seller
//       const { data: sellerBrandLinks } = await query.graph({
//         entity: SellerBrandLink.entryPoint,
//         fields: ["*", "brand.*"],
//         filters: {
//           seller_id: seller_id,
//         },
//       })

//       const sellerBrandIds = sellerBrandLinks.map((link) => link.brand_id || link.brand?.id)
//       const sellerBrandNames = sellerBrandLinks.map((link) => link.brand?.name)

//       // Check if all brands in the CSV belong to the seller
//       const invalidBrands: string[] = []

//       for (const brand of brands) {
//         if (!sellerBrandIds.includes(brand.id)) {
//           invalidBrands.push(brand.name)
//         }
//       }

//       if (invalidBrands.length > 0) {
//         throw new Error(
//           `The following brands are not associated with this seller: ${invalidBrands.join(', ')}. ` +
//           `Seller is only authorized to import products for these brands: ${sellerBrandNames.join(', ')}`
//         )
//       }

//       return new StepResponse(brands)
//     } catch (error) {
//       console.error('Error validating seller brands:', error)
//       throw error
//     }
//   }
// )
// export const vendorProductCheckStep = createStep(
//   "vendor-product-check",
//   async (
//     input: {
//       products: any[],
//       seller_id: string
//     },
//     { container }
//   ) => {
//     const query = container.resolve("query")
//     const { products, seller_id } = input

//     for (const product of products) {
//       if (product.id) {
//         const { data } = await query.graph({
//           entity: SellerProductLink.entryPoint,
//           fields: ["seller_id", "product_id"],
//           filters: {
//             seller_id: seller_id,
//             product_id: product.id,
//           },
//         })
//         if (data.length === 0) {
//           throw new MedusaError(
//             MedusaError.Types.INVALID_DATA,
//             `Product with handle ${product.handle} does not belong to seller`
//           )
//         }
//       }
//     }
//   })

// export const batchCreateLinksStep = createStep(
//   'batch-create-links',
//   async (links: any[], { container }) => {
//     try {
//       const linkService = container.resolve("link")
//       const BATCH_SIZE = 10

//       // Process links in batches with parallel processing
//       for (let i = 0; i < links.length; i += BATCH_SIZE) {
//         const batch = links.slice(i, i + BATCH_SIZE)

//         try {
//           // Process links in parallel within each batch
//           await Promise.all(batch.map(async (link) => {
//             try {
//               return await linkService.create(link)
//             } catch (linkError) {
//               console.error(`Error creating individual link:`, linkError)
//               // Continue with other links in batch
//               return null
//             }
//           }))
//         } catch (error) {
//           console.error(`Error creating link batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error)
//           // Continue with next batch instead of failing entire operation
//         }

//         // Small delay between batches
//         if (i + BATCH_SIZE < links.length) {
//           await new Promise(resolve => setTimeout(resolve, 50))
//         }
//       }

//       return new StepResponse(links)
//     } catch (error) {
//       console.error('Error in batch link creation:', error)
//       return new StepResponse([])
//     }
//   }
// )

// export const importSellerProductsWorkflow = createWorkflow(
//   'import-seller-products',
//   function (input: {
//     file_content: string
//     seller_id: string
//     submitter_id: string
//   }) {
//     const products = parseProductCsvStep(input.file_content)
//     const batchCreate = validateProductsToImportStep(products)

//     // Fetch all unique brand names from the products to import
//     const brandNames = transform(batchCreate, (products: any[]) =>
//       Array.from(new Set(products.map((p: any) => p.brand)))
//     )

//     // Query brands by name
//     const { data: brands } = useQueryGraphStep({
//       entity: 'brand',
//       fields: ['id', 'name'],
//       filters: {
//         name: { $in: brandNames },
//       },
//     })

//     // Validate that only the CSV-provided brands belong to the seller
//     const validatedBrands = validateSellerBrandsStep({ brands, seller_id: input.seller_id })

//     // Map brand_id to each product
//     const productsWithBrandId = transform(
//       { batchCreate, brands: validatedBrands },
//       ({ batchCreate, brands }: { batchCreate: any[], brands: any[] }) =>
//         batchCreate.map((product: any) => {
//           const brand = brands.find((b: any) => b.name === product.brand)
//           return {
//             ...product,
//             brand_id: brand?.id,
//           }
//         })
//     )

//     // Separate products into updates and creates
//     const { toUpdate, toCreate } = transform(productsWithBrandId, (products: any[]) => {
//       const updates: any[] = []
//       const creates: any[] = []

//       for (const product of products) {
//         if (product._isUpdate) {
//           updates.push({
//             ...product,
//             id: product._existingId,
//             // Remove our internal flags
//             _isUpdate: undefined,
//             _existingId: undefined
//           })
//         } else {
//           creates.push({
//             ...product,
//             // Remove our internal flags
//             _isUpdate: undefined,
//             _existingId: undefined
//           })
//         }
//       }

//       return { toUpdate: updates, toCreate: creates }
//     })

//     // Ensure products to update belong to the seller
//     vendorProductCheckStep({ products: toUpdate, seller_id: input.seller_id })

//     // Handle product updates and creation in parallel for better performance
//     const updated = updateProductsWorkflow.runAsStep({
//       input: {
//         products: toUpdate,
//         additional_data: { seller_id: input.seller_id }
//       }
//     })

//     // Handle product creation  
//     const created = createProductsWorkflow.runAsStep({
//       input: {
//         products: toCreate,
//         additional_data: { seller_id: input.seller_id, brand_id: validatedBrands[0]?.id }
//       }
//     })

//     // Combine results for downstream processing
//     const allProcessedProducts = transform({ updated, created }, ({ updated, created }: { updated: any[], created: any[] }) => {
//       const combined = [...(updated || []), ...(created || [])]

//       // CRITICAL FIX: Filter to unique products only (remove duplicate variants)
//       // The issue is that createProductsWorkflow returns all variants as separate items
//       const uniqueProducts = combined.filter((item, index, array) => {
//         // Keep only the first occurrence of each product ID
//         return array.findIndex(p => p.id === item.id) === index
//       })

//       return uniqueProducts
//     })

//     processProductConfigurationStep({ created: allProcessedProducts, productsWithBrandId })
//     processAttributesStep({ created: allProcessedProducts, productsWithBrandId })
//     const imageProcessingResult = processProductImagesStep({ created: allProcessedProducts, productsWithBrandId })

//     const requestsPayload = transform(
//       { allProcessedProducts, input },
//       ({ allProcessedProducts, input }: { allProcessedProducts: any[], input: any }) => {
//         return allProcessedProducts.map((p: any) => ({
//           data: {
//             ...p,
//             product_id: p.id
//           },
//           submitter_id: input.submitter_id,
//           type: 'product',
//           status: 'pending' as RequestStatus
//         }))
//       }
//     )

//     const requests = createRequestStep(requestsPayload)

//     const link = transform({ requests, input }, ({ requests, input }: { requests: any[], input: any }) => {
//       return requests.map(({ id }: any) => ({
//         [SELLER_MODULE]: {
//           seller_id: input.seller_id
//         },
//         [REQUESTS_MODULE]: {
//           request_id: id
//         }
//       }))
//     })

//     const productBrandLinks = transform(
//       { allProcessedProducts, productsWithBrandId },
//       ({ allProcessedProducts, productsWithBrandId }: { allProcessedProducts: any[], productsWithBrandId: any[] }) =>
//         allProcessedProducts.map((processedProduct: any, idx: number) => ({
//           [Modules.PRODUCT]: { product_id: processedProduct.id },
//           [BRAND_MODULE]: { brand_id: productsWithBrandId[idx].brand_id },
//         }))
//     )

//     const allLinks = transform(
//       { productBrandLinks, link },
//       ({ productBrandLinks, link }: { productBrandLinks: any[], link: any[] }) => [...productBrandLinks, ...link]
//     )

//     const events = transform(requests, (requests: any[]) => {
//       return requests.map(({ id }: any) => ({
//         name: ProductRequestUpdatedEvent.CREATED,
//         data: { id }
//       }))
//     })

//     batchCreateLinksStep(allLinks)
//     emitMultipleEventsStep(events)

//     // Extract failed images from image processing result
//     const failedImages = transform(imageProcessingResult, (result: any) => {
//       return result?.failedImages || []
//     })

//     return new WorkflowResponse({
//       products: allProcessedProducts,
//       failedImages
//     })
//   }
// )
