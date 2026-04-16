// import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
// import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

// import productSellerLink from '@mercurjs/core-plugin/links/product-seller-link'

// // Extended fields for comprehensive product export including all related data
// export const customExportProductFields = [
//   // Core product fields
//   'id',
//   'title',
//   'subtitle',
//   'status',
//   'external_id',
//   'description',
//   'handle',
//   'is_giftcard',
//   'discountable',
//   'thumbnail',
//   'collection_id',
//   'type_id',
//   'weight',
//   'length',
//   'height',
//   'width',
//   'hs_code',
//   'origin_country',
//   'mid_code',
//   'material',
//   'metadata',
//   'created_at',
//   'updated_at',
  
//   // Brand information
//   'brand.*',
//   'brand.id',
//   'brand.name',
//   'brand.handle',
//   'brand.description',
  
//   // Product type and collection
//   'type.*',
//   'type.id',
//   'type.value',
//   'collection.*',
//   'collection.id',
//   'collection.title',
//   'collection.handle',
  
//   // Product options and values
//   'options.*',
//   'options.id',
//   'options.title',
//   'options.values.*',
//   'options.values.id',
//   'options.values.value',
  
//   // Tags
//   'tags.*',
//   'tags.id',
//   'tags.value',
  
//   // Images
//   'images.*',
//   'images.id',
//   'images.url',
//   'images.metadata',
  
//   // Variants with comprehensive details
//   'variants.*',
//   'variants.id',
//   'variants.title',
//   'variants.sku',
//   'variants.barcode',
//   'variants.ean',
//   'variants.upc',
//   'variants.allow_backorder',
//   'variants.manage_inventory',
//   'variants.hs_code',
//   'variants.origin_country',
//   'variants.mid_code',
//   'variants.material',
//   'variants.weight',
//   'variants.length',
//   'variants.height',
//   'variants.width',
//   'variants.metadata',
//   'variants.created_at',
//   'variants.updated_at',
  
//   // Variant prices
//   'variants.prices.*',
//   'variants.prices.id',
//   'variants.prices.currency_code',
//   'variants.prices.amount',
//   'variants.prices.min_quantity',
//   'variants.prices.max_quantity',
//   'variants.prices.price_rules.*',
//   'variants.prices.price_rules.value',
//   'variants.prices.price_rules.attribute',
  
//   // Variant options
//   'variants.options.*',
//   'variants.options.id',
//   'variants.options.value',
//   'variants.options.option_id',
  
//   // Categories
//   'categories.*',
//   'categories.id',
//   'categories.name',
//   'categories.handle',
//   'categories.description',
  
//   // Sales channels
//   'sales_channels.*',
//   'sales_channels.id',
//   'sales_channels.name',
//   'sales_channels.description'
// ]

// interface ExportFilters {
//   seller_id?: string
//   brand_id?: string
//   category_id?: string
//   status?: string
//   created_at?: string
//   updated_at?: string
//   tag_id?: string
//   type_id?: string
//   sales_channel_id?: string
// }

// export const getCustomProductsForExportStep = createStep(
//   'get-custom-products-for-export',
//   async (filters: ExportFilters, { container }) => {
//     const query = container.resolve(ContainerRegistrationKeys.QUERY)

//     // Step 1: Get product IDs for sales_channel_id
//     let productIds: string[] | undefined = undefined
//     if (filters.sales_channel_id) {
//       const { data: productSalesChannels } = await query.graph({
//         entity: "product_sales_channel",
//         fields: ["product_id"],
//         filters: { sales_channel_id: filters.sales_channel_id },
//       })
//       productIds = productSalesChannels.map((psc: any) => psc.product_id)
//       if (!productIds.length) {
//         return new StepResponse({ products: [], seller: null, attributeValues: [], productConfigurations: [] })
//       }
//     }

//     // Step 2: Get product IDs for tag_id
//     let tagProductIds: string[] | undefined = undefined
//     if (filters.tag_id) {
//       const { data: productTags } = await query.graph({
//         entity: "product_tag",
//         fields: ["product_id"],
//         filters: { tag_id: filters.tag_id },
//       })
//       tagProductIds = productTags.map((pt: any) => pt.product_id)
//       if (!tagProductIds.length) {
//         return new StepResponse({ products: [], seller: null, attributeValues: [], productConfigurations: [] })
//       }
//     }

//     // Step 3: Get product IDs for brand_id (using product-brand link)
//     let brandProductIds: string[] | undefined = undefined
//     if (filters.brand_id) {
//       const { data: productBrands } = await query.graph({
//         entity: "product_brand",
//         fields: ["product_id"],
//         filters: { brand_id: filters.brand_id },
//       })
//       brandProductIds = productBrands.map((pb: any) => pb.product_id)
//       if (!brandProductIds.length) {
//         return new StepResponse({ products: [], seller: null, attributeValues: [], productConfigurations: [] })
//       }
//     }

//     // Step 4: Get product IDs for category_id
//     let categoryProductIds: string[] | undefined = undefined
//     if (filters.category_id) {
//       const { data: products } = await query.graph({
//         entity: "product",
//         fields: ["id"],
//         filters: { categories: { id: filters.category_id } },
//       })
//       categoryProductIds = products.map((p: any) => p.id)
//       if (!categoryProductIds.length) {
//         return new StepResponse({ products: [], seller: null, attributeValues: [], productConfigurations: [] })
//       }
//     }

//     // Step 5: Build product filters for other product-level filters
//     const productFilters: any = {}
//     if (filters.status) productFilters.status = filters.status
//     if (filters.created_at) productFilters.created_at = filters.created_at
//     if (filters.updated_at) productFilters.updated_at = filters.updated_at
//     if (filters.type_id) productFilters.type_id = filters.type_id

//     // Step 6: Combine product IDs from sales_channel, tag, brand, and category filters (excluding seller)
//     let combinedProductIds: string[] | undefined = undefined
//     const productIdArrays = [productIds, tagProductIds, brandProductIds, categoryProductIds].filter(Boolean)
    
//     if (productIdArrays.length > 0) {
//       // Start with the first array and find intersection with all others
//       combinedProductIds = productIdArrays.reduce((acc, current) => {
//         if (!acc) return current
//         return acc!.filter(id => current!.includes(id))
//       })
      
//       // If intersection results in empty array, return empty result
//       if (combinedProductIds && combinedProductIds.length === 0) {
//         return new StepResponse({ products: [], seller: null, attributeValues: [], productConfigurations: [] })
//       }
//     }

//     if (combinedProductIds) productFilters.id = combinedProductIds

//     // Step 7: Query products by filters if any product filter is present
//     let filteredProductIds: string[] | undefined = undefined
//     if (Object.keys(productFilters).length > 0) {
//       const { data: products } = await query.graph({
//         entity: "product",
//         fields: ["id"],
//         filters: productFilters,
//       })
//       filteredProductIds = products.map((p: any) => p.id)
//       if (!filteredProductIds.length) {
//         return new StepResponse({ products: [], seller: null, attributeValues: [], productConfigurations: [] })
//       }
//     }

//     // Step 8: Build filters for the link table (seller filter applied here for correct relationship handling)
//     const linkFilters: any = {}
//     if (filters.seller_id) linkFilters.seller_id = filters.seller_id
//     if (filteredProductIds) linkFilters.product_id = filteredProductIds

//     // Step 9: Query the link table and fetch related products and seller info
//     // Use pagination to avoid loading all products at once (memory optimization)
//     const PAGE_SIZE = 200 // Fetch 200 products at a time (similar to Medusa's approach)
    
//     let links: any[] = []
//     let page = 0
//     let hasMore = true
    
//     // Fetch products in pages to manage memory
//     while (hasMore) {
//       const result = await query.graph({
//         entity: productSellerLink.entryPoint,
//         fields: [
//           "id",
//           "name",
//           ...customExportProductFields.map((field) => `product.${field}`),
//           "seller.*",
//           "seller.id",
//           "seller.name",
//           "seller.handle",
//           "seller.email",
//           "seller.phone",
//           "seller.description",
//           "seller.metadata"
//         ],
//         filters: linkFilters,
//         pagination: {
//           skip: page * PAGE_SIZE,
//           take: PAGE_SIZE
//         }
//       })
      
//       const pageLinks = result.data || []
//       links.push(...pageLinks)
      
//       // Check if we have more pages
//       hasMore = pageLinks.length === PAGE_SIZE
//       page++
      
//       // Allow garbage collection between pages
//       if (hasMore) {
//         await new Promise(resolve => setImmediate(resolve))
//       }
//     }

//     // Extract products and seller information
//     const products = links.map((link: any) => link.product)
//     const seller = links.length > 0 ? links[0].seller : null

//     // Get attribute values for products
//     const finalProductIds = products.map(product => product.id)
//     let attributeValues: any[] = []
    
//     if (finalProductIds.length > 0) {
//       try {
//         const { data: attributes } = await query.graph({
//           entity: 'product_attribute_value',
//           fields: [
//             'product_id',
//             'attribute_value.*',
//             'attribute_value.id',
//             'attribute_value.value',
//             'attribute_value.attribute.*',
//             'attribute_value.attribute.id',
//             'attribute_value.attribute.name',
//             'attribute_value.attribute.handle'
//           ],
//           filters: {
//             product_id: finalProductIds
//           }
//         })
//         attributeValues = attributes
//       } catch (error) {
//         console.warn('Could not fetch attribute values:', error)
//       }
//     }

//     // Get product configurations
//     let productConfigurations: any[] = []
//     if (finalProductIds.length > 0) {
//       try {
//         const { data: configurations } = await query.graph({
//           entity: 'product_product_configuration',
//           fields: [
//             'product_id',
//             'product_configuration.*',
//             'product_configuration.id',
//             'product_configuration.name',
//             'product_configuration.description',
//             'product_configuration.metadata'
//           ],
//           filters: {
//             product_id: finalProductIds
//           }
//         })
//         productConfigurations = configurations
//       } catch (error) {
//         console.warn('Could not fetch product configurations:', error)
//       }
//     }

//     return new StepResponse({
//       products,
//       seller,
//       attributeValues,
//       productConfigurations
//     })
//   }
// )
