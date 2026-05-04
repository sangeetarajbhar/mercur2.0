import { Knex } from 'knex'
import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, QueryContext } from '@medusajs/framework/utils'


import priceExtendLink from '../../links/price-extend-price'


import productSellerLink from '@mercurjs/core/links/product-seller-link'
import { wrapVariantsWithSellerPricing, wrapVariantsWithInventoryQuantityForSalesChannel, transformProductImageUrls } from '../../api/utils/middlewares'
import { dataNormalization } from '../../api/utils/middlewares/products/data-for-sorting'

const ALGOLIA_COLLECTION_METADATA_KEYS = [
  'algolia_collections',
  'algoliaCollections',
  'algolia_collection',
  'algoliaCollection',
  '_collections'
] as const

const normalizeCollectionEntries = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeCollectionEntries(entry))
  }

   // Handle strings
   if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Parse JSON-looking strings
    const isJson =
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"));

    if (isJson) {
      try {
        return normalizeCollectionEntries(JSON.parse(trimmed));
      } catch (error) {
        // If parsing fails, treat as a normal string and split by comma
        return trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    // Split CSV-style strings
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }


  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>
    if ('name' in input) return normalizeCollectionEntries(input.name)
    if ('title' in input) return normalizeCollectionEntries(input.title)

    return Object.values(input).flatMap(normalizeCollectionEntries);
  }

  return []
}

const resolveAlgoliaCollections = (
  product: any,
  fallbackCollections: string[]
) => {
  const collectionSet = new Set<string>(
    fallbackCollections.map((value) => value.trim()).filter(Boolean)
  )

  const metadata = product?.metadata
  if (metadata && typeof metadata === 'object') {
    for (const key of ALGOLIA_COLLECTION_METADATA_KEYS) {
      if (metadata[key] !== undefined) {
        const entries = normalizeCollectionEntries(metadata[key])
        entries.forEach((entry) => entry && collectionSet.add(entry))
      }
    }
  }

  if (Array.isArray(product?._collections)) {
    product._collections
      .filter((entry: string) => typeof entry === 'string' && entry.trim())
      .forEach((entry: string) => collectionSet.add(entry.trim()))
  }

  return Array.from(collectionSet)
}

/**
 * Fetch discount percentages for given price IDs using the link to ExtendPrice
 */
async function getPriceDiscounts(container: MedusaContainer, priceIdsArray: string[]) {
  if (!priceIdsArray.length) return {}

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const pricesWithDiscount = await query.graph({
    entity: priceExtendLink.entryPoint,
    fields: ["extend_price.percentage_discount", "price.*"],
    filters: { price_id : { $in: priceIdsArray } }
  })

  const discountMap: Record<string, number | null> = {}

  pricesWithDiscount.data.forEach((p: any) => {
    const priceId = p.price_id || p.price?.id
    const discount = p.extend_price?.percentage_discount ?? null

    if (priceId) {
      discountMap[priceId] = discount
    }
  })
  return discountMap
}

async function selectProductSeller(
  container: MedusaContainer,
  product_id: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [product]
  } = await query.graph({
    entity: productSellerLink.entryPoint,
    fields: ['seller_id', 'seller.handle', 'seller.store_status'],
    filters: {
      product_id
    }
  })

  return product
    ? {
        id: product.seller_id,
        handle: product.seller.handle,
        store_status: product.seller.store_status
      }
    : null
}

/**
 * Batch fetch sellers for multiple products at once
 * Returns a Map of product_id -> seller object (or null)
 */
async function selectProductsSellersBatch(
  container: MedusaContainer,
  product_ids: string[]
): Promise<Map<string, { id: string; handle: string | null; store_status: any } | null>> {
  if (!product_ids || product_ids.length === 0) {
    return new Map()
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellerProducts } = await query.graph({
    entity: productSellerLink.entryPoint,
    fields: ['product_id', 'seller_id', 'seller.handle', 'seller.store_status'],
    filters: {
      product_id: product_ids
    }
  })

  const sellerMap = new Map<string, { id: string; handle: string | null; store_status: any } | null>()

  // Initialize all products with null (in case they don't have sellers)
  product_ids.forEach(id => sellerMap.set(id, null))

  // Set sellers for products that have them
  sellerProducts.forEach((sp: any) => {
    if (sp.product_id) {
      sellerMap.set(sp.product_id, {
        id: sp.seller_id,
        handle: sp.seller?.handle || null,
        store_status: sp.seller?.store_status || null
      })
    }
  })

  return sellerMap
}

async function selectProductAvailableLocations(
  container: MedusaContainer,
  product_id: string
) {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

  const productLocationMappings = await knex('product_product_stock_location_stock_location')
    .select('stock_location_id')
    .where('product_id', product_id)
    .whereNull('deleted_at')
  return productLocationMappings.map((mapping: any) => mapping.stock_location_id)
}

/**
 * Get all sellers for products when location filtering is not needed
 * This ensures consistent pricing calculation without location dependencies
 */
async function getSellersForProducts(
  container: MedusaContainer,
  productIds: string[]
): Promise<string[]> {
  if (!productIds || productIds.length === 0) {
    return []
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: sellerProductMappings } = await query.graph({
      entity: productSellerLink.entryPoint,
      fields: ['seller_id', 'product_id'],
      filters: {
        product_id: { $in: productIds }
      }
    })

    return [...new Set(sellerProductMappings.map((mapping: any) => mapping.seller_id))]
  } catch (error) {
    console.error('Error getting sellers for products:', error)
    return []
  }
}

/**
 * Batch fetch available locations for multiple products at once
 * Returns a Map of product_id -> array of location_ids
 * Only includes locations that the product is directly mapped to (no child locations)
 */
// async function selectProductsAvailableLocationsBatch(
//   container: MedusaContainer,
//   product_ids: string[]
// ): Promise<Map<string, string[]>> {
//   if (!product_ids || product_ids.length === 0) {
//     return new Map()
//   }

//   const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex

//   const productLocationMappings = await knex('product_product_stock_location_stock_location')
//     .select('product_id', 'stock_location_id')
//     .whereIn('product_id', product_ids)
//     .whereNull('deleted_at')

//   const locationMap = new Map<string, string[]>()
  
//   // Initialize all products with empty arrays
//   product_ids.forEach(id => locationMap.set(id, []))

//   // Group locations by product_id - only include directly mapped locations
//   productLocationMappings.forEach((mapping: any) => {
//     const productId = mapping.product_id
//     const locationId = mapping.stock_location_id

//     if (productId && locationId) {
//       const existing = locationMap.get(productId) || []
      
//       // Add only the location that the product is directly mapped to
//       if (!existing.includes(locationId)) {
//         existing.push(locationId)
//       }
      
//       locationMap.set(productId, existing)
//     }
//   })

//   return locationMap
// }

/**
 * Batch fetch parent (direct) location IDs only from product_product_stock_location_stock_location.
 * Used for Algolia product.available_locations (no hierarchy expansion).
 */
export async function selectProductsParentLocationsBatch(
  container: MedusaContainer,
  product_ids: string[]
): Promise<Map<string, string[]>> {
  if (!product_ids || product_ids.length === 0) {
    return new Map()
  }

  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

  const productLocationMappings = await knex('product_product_stock_location_stock_location')
    .select('product_id', 'stock_location_id')
    .whereIn('product_id', product_ids)
    .whereNull('deleted_at')

  const locationMap = new Map<string, string[]>()
  product_ids.forEach(id => locationMap.set(id, []))

  productLocationMappings.forEach((mapping: any) => {
    const productId = mapping.product_id
    const locationId = mapping.stock_location_id
    if (!productId || !locationId) return
    const existing = locationMap.get(productId) || []
    if (!existing.includes(locationId)) {
      existing.push(locationId)
    }
    locationMap.set(productId, existing)
  })

  return locationMap
}

export async function selectProductsAvailableLocationsBatch(
  container: MedusaContainer,
  product_ids: string[]
): Promise<Map<string, string[]>> {
  if (!product_ids || product_ids.length === 0) {
    return new Map()
  }

  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const productLocationMappings = await knex('product_product_stock_location_stock_location')
    .select('product_id', 'stock_location_id')
    .whereIn('product_id', product_ids)
    .whereNull('deleted_at')

  const locationMap = new Map<string, string[]>()
  product_ids.forEach(id => locationMap.set(id, []))

  if (productLocationMappings.length === 0) {
    return locationMap
  }

  // Unique parent location IDs (product's direct stock locations)
  const parentLocationIds = [...new Set(productLocationMappings.map((m: any) => m.stock_location_id).filter(Boolean))]

  // Fetch all children for these parents from location_hierarchy (same as PDP expansion)
  const { data: locationHierarchies } = await query.graph({
    entity: 'location_hierarchy',
    fields: ['parent_location_id', 'child_location_id'],
    filters: { parent_location_id: { $in: parentLocationIds } }
  })

  // Build parent -> [parent, ...children] so we can expand per product
  const parentToExpanded = new Map<string, string[]>()
  for (const locId of parentLocationIds) {
    parentToExpanded.set(locId, [locId])
  }
  ;(locationHierarchies || []).forEach((h: { parent_location_id: string; child_location_id: string }) => {
    const parentId = h.parent_location_id
    const childId = h.child_location_id
    if (!parentId || !childId) return
    let expanded = parentToExpanded.get(parentId)
    if (!expanded) {
      expanded = [parentId]
      parentToExpanded.set(parentId, expanded)
    }
    if (!expanded.includes(childId)) {
      expanded.push(childId)
    }
  })

  // Per product: for each of its direct locations, add that location + its children; dedupe
  productLocationMappings.forEach((mapping: any) => {
    const productId = mapping.product_id
    const locationId = mapping.stock_location_id
    if (!productId || !locationId) return

    const expanded = parentToExpanded.get(locationId) || [locationId]
    const existing = locationMap.get(productId) || []
    expanded.forEach((id: string) => {
      if (!existing.includes(id)) {
        existing.push(id)
      }
    })
    locationMap.set(productId, existing)
  })

  return locationMap
}

export async function filterProductsByStatus(
  container: MedusaContainer,
  ids: string[] = []
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['id', 'status', 'deleted_at'],
    filters: {
      id: ids
    }
  })

  const validIds = products
    .filter((p) => p.status === 'published' && !p.deleted_at)
    .map((p) => p.id)

  const invalidIds = products
    .filter((p) => p.status !== 'published' || p.deleted_at)
    .map((p) => p.id)

  const missingIds = ids.filter(
    (id) => !products.some((product) => product.id === id)
  )

  const other = Array.from(new Set([...invalidIds, ...missingIds]))

  return {
    published: validIds,
    other
  }
}


export async function dataSorting(products: any[], container?: MedusaContainer) {
  if (!container) {
    // If no container provided, return products as-is (fallback behavior)
    return products
  }

  // Transform variants from Algolia structure to structure expected by dataNormalization
  // Algolia variants have: calculated_amount, seller_prices, min_price_seller_id directly on variant
  // dataNormalization expects: variant.calculated_price.calculated_amount, variant.calculated_price.seller_prices, etc.
  const transformedProducts = products.map(product => {
    const transformedVariants = (product.variants || []).map((variant: any) => {
      // If variant already has calculated_price structure, use it as-is
      if (variant.calculated_price) {
        return variant
      }

      // Transform from Algolia structure to expected structure
      const transformedVariant = { ...variant }
      
      // Extract price ID from prices array if available (stored at variant.prices[0].id)
      let priceId: string | null = null
      if (variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0) {
        priceId = variant.prices[0]?.id || null
      }
      
      // Build calculated_price object from flat variant structure
      if (variant.calculated_amount !== undefined || variant.seller_prices || variant.min_price_seller_id) {
        // Reconstruct seller_prices with proper structure if they have price IDs
        const reconstructedSellerPrices: Record<string, any> = {}
        if (variant.seller_prices) {
          Object.entries(variant.seller_prices).forEach(([sellerId, sellerPrice]: [string, any]) => {
            reconstructedSellerPrices[sellerId] = {
              calculated_amount: sellerPrice.calculated_amount,
              original_amount: sellerPrice.original_amount,
              percentage_of_discount: sellerPrice.percentage_of_discount,
              // Preserve price ID if available
              calculated_price: sellerPrice.calculated_price?.id ? { id: sellerPrice.calculated_price.id } : null
            }
          })
        }
        
        transformedVariant.calculated_price = {
          calculated_amount: variant.calculated_amount,
          original_amount: variant.original_amount,
          currency_code: variant.currency_code,
          seller_prices: reconstructedSellerPrices,
          min_price_seller_id: variant.min_price_seller_id,
          percentage_of_discount: variant.percentage_of_discount,
          // Set calculated_price.id for discount lookup
          calculated_price: priceId ? { id: priceId } : null
        }
      }

      return transformedVariant
    })

    // Normalize final_score: preserve existing values set via sync API, only default to 0 if undefined/null/invalid
    // moved this code in tranform loop instead of using one more loop
    let normalizedFinalScore: number
    if (product.final_score !== undefined && product.final_score !== null) {
      if (typeof product.final_score === 'number') {
        normalizedFinalScore = product.final_score
      } else {
        normalizedFinalScore = 0
      }
    } else {
      normalizedFinalScore = 0
    }

    const created_at_timestamp = product.created_at ? new Date(product.created_at).getTime() : Date.now()

    return {
      ...product,
      variants: transformedVariants,
      final_score: normalizedFinalScore,
      created_at_timestamp
    }
  })

  // Create a mock request object with container as scope for dataNormalization
  const mockRequest = {
    scope: container
  } as any

  // Use dataNormalization from the middleware
  await dataNormalization(mockRequest, transformedProducts)

  return transformedProducts
}


export const dataFiltering = async (
  products: any[],
  container?: MedusaContainer,
  allCategoryLinkedAttributeIds?: Set<string>,
  categoryAttributesMap?: Map<string, any[]>
) => {
  if (!products?.length) return [];

  return products.map((product) => {
    const colors: string[] = [];
    const sizes: string[] = [];
    const brands: string[] = [];
    const categories: string[] = [];
    const materials: string[] = [];
    const types: string[] = [];
    const occasions: string[] = [];
    const genders: string[] = [];

    if (product.options?.length) {
      for (const opt of product.options) {
        if (opt.title?.toLowerCase() === "color") {
          opt.values?.forEach(v => v.value && colors.push(v.value));
        }
        if (opt.title?.toLowerCase() === "size") {
          opt.values?.forEach(v => v.value && sizes.push(v.value));
        }
      }
    }

    for (const variant of product.variants || []) {
      if (variant.options?.length) {
        for (const opt of variant.options) {
          if (opt.option?.title?.toLowerCase() === "color") {
            opt.value && colors.push(opt.value);
          }
          if (opt.option?.title?.toLowerCase() === "size") {
            opt.value && sizes.push(opt.value);
          }
        }
      }

      if (variant.color) colors.push(variant.color);
      if (variant.size) sizes.push(variant.size);
      if (variant.material) materials.push(variant.material);
      if (variant.type) types.push(variant.type);
      if (variant.occasion) occasions.push(variant.occasion);
    }

    if (product.brand) {
      const brandName = typeof product.brand === 'string' ? product.brand : product.brand?.name;
      if (brandName) brands.push(brandName);
    }
    if (product.categories?.length) {
      product.categories.forEach((c: any) => {
        if (c.name) categories.push(c.name);
      });
    }
    if (product.category) {
      const categoryName = typeof product.category === 'string' ? product.category : product.category?.name;
      if (categoryName) categories.push(categoryName);
    }
    if (product.material) materials.push(product.material);
    if (product.type) types.push(product.type);
    if (product.occasion) occasions.push(product.occasion);

    const customFilters: Record<string, string[]> = {};

    const categoryFilterableAttributeIds = new Set<string>();

    if (product.categories?.length && categoryAttributesMap) {
      product.categories.forEach((cat: any) => {
        const categoryAttrs = categoryAttributesMap.get(cat.id) || [];
        for (const attr of categoryAttrs) {
          if (attr.is_filterable && attr.id) {
            categoryFilterableAttributeIds.add(attr.id);
          }
        }
      });
    }

    const filteredAttributeValues: any[] = [];

    if (product.attribute_values?.length) {
      for (const attrValue of product.attribute_values) {
        if (!attrValue.is_filterable || !attrValue.name || !attrValue.value) {
          continue;
        }

        const isGlobalAttribute = attrValue.attribute_id &&
                                  allCategoryLinkedAttributeIds &&
                                  !allCategoryLinkedAttributeIds.has(attrValue.attribute_id);

        const isCategorySpecificAttribute = attrValue.attribute_id &&
                                           categoryFilterableAttributeIds.has(attrValue.attribute_id);

        const hasNoCategories = !product.categories || product.categories.length === 0;

        const shouldInclude = hasNoCategories ||
                              isGlobalAttribute ||
                              isCategorySpecificAttribute;

        if (shouldInclude) {
          const filterKey = attrValue.name.toLowerCase().replace(/\s+/g, '_');

          if (filterKey === 'gender') {
            if (!customFilters[filterKey]) {
              customFilters[filterKey] = [];
            }
            
            // Expand Unisex to include both Men and Women
            if (attrValue.value?.toLowerCase() === 'unisex') {
              // Add both to customFilters (not just Unisex)
              if (!customFilters[filterKey].includes('Men')) {
                customFilters[filterKey].push('Men');
              }
              if (!customFilters[filterKey].includes('Women')) {
                customFilters[filterKey].push('Women');
              }
              // Also add to genders array
              genders.push('Men');
              genders.push('Women');
            } else {
              // Normal gender value
              if (!customFilters[filterKey].includes(attrValue.value)) {
                customFilters[filterKey].push(attrValue.value);
              }
              genders.push(attrValue.value);
            }
          } else {
            // For non-gender attributes, add normally
            if (!customFilters[filterKey]) {
              customFilters[filterKey] = [];
            }
            if (!customFilters[filterKey].includes(attrValue.value)) {
              customFilters[filterKey].push(attrValue.value);
            }
          }

          filteredAttributeValues.push(attrValue);
        }
      }
    }

    product.attribute_values = filteredAttributeValues;

    // Collections are handled via _collections metadata, not from DB
    const collections: string[] = [];

    product.filters = {
      color: Array.from(new Set(colors)),
      size: Array.from(new Set(sizes)),
      brand: Array.from(new Set(brands)),
      category: Array.from(new Set(categories)),
      material: Array.from(new Set(materials)),
      type: Array.from(new Set(types)),
      occasion: Array.from(new Set(occasions)),
      gender: Array.from(new Set(genders)),
      collection: Array.from(new Set(collections)),
      ...Object.fromEntries(
        Object.entries(customFilters).map(([key, values]) => [
          key,
          Array.from(new Set(values))
        ])
      )
    };

    product._collections = resolveAlgoliaCollections(product, collections);

    delete product.global_min_price;
    delete product.global_max_price;

    return product;
  });
};


export const flattenVariants = async (products: any[]) => {
  if (!products?.length) return [];

  return products.map((product) => {
    product.variants = (product.variants || []).map((variant: any) => {
      const parts = [
        variant.title,
        variant.color,
        variant.material,
        variant.type,
        variant.occasion,
      ].filter(Boolean);

      return {
        ...variant,
        searchKey: parts.join(" / "),
      };
    });

    return {
      ...product,
    };
  });
};





function optimizeForAlgolia(products: any[]): any[] {

  return products.map(product => {
    const optimized: any = {
      ...product,

     
      id: product.id,
      variants: product.variants?.slice(0, 10).map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        options: variant.options?.slice(0, 3).map((opt: any) => ({
          id: opt.id,
          value: opt.value,
          option: {
            id: opt.option?.id || '',
            title: opt.option?.title || ''
          }
        })) || [],
       
        calculated_amount: variant.calculated_price?.seller_prices?.[variant.min_price_seller_id]?.calculated_amount || variant.calculated_amount,
        currency_code: variant.currency_code,
        seller_prices: variant.seller_prices ?
          Object.fromEntries(Object.entries(variant.seller_prices).slice(0, 3)) : {},
        min_price_seller_id: variant.min_price_seller_id,
        original_amount: variant.calculated_price?.seller_prices?.[variant.min_price_seller_id]?.original_amount || variant.original_amount,
        percentage_of_discount: (() => {
          const calculatedAmount = variant.calculated_price?.seller_prices?.[variant.min_price_seller_id]?.calculated_amount || variant.calculated_amount;
          const originalAmount = variant.calculated_price?.seller_prices?.[variant.min_price_seller_id]?.original_amount || variant.original_amount;

          if (originalAmount && calculatedAmount && originalAmount > calculatedAmount) {
            return Math.round(((originalAmount - calculatedAmount) / originalAmount) * 100);
          }

          // return variant.percentage_of_discount || null;
          return 0; // return 0  this is a fallback when percentage_of_discount is not available in the response instead of stored value
        })(),
        searchKey: variant.searchKey
      })) || [],
      images: product.images?.slice(0, 5)
        .filter((img: any) => img.url)
        .map((img: any) => ({
          url: img.url
        })) || [],
      categories: product.categories?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        handle: cat.handle
      })) || [],
      attribute_values: product.attribute_values?.slice(0, 10)
        .filter((attr: any) => attr?.value != null && attr.value !== '')
        .map((attr: any) => ({
          attribute_id: attr.attribute_id,
          name: attr.name,
          value: attr.value,
          is_filterable: attr.is_filterable
        })) || [],
      options: product.options?.slice(0, 10) || [],
      seller: product.seller ? {
        id: product.seller.id,
        handle: product.seller.handle,
        store_status: product.seller.store_status
      } : undefined,
      // Collection is managed via _collections metadata only
      _collections: Array.isArray(product._collections)
        ? product._collections
            .filter((entry: string) => typeof entry === 'string')
            .map((entry: string) => entry.trim())
            .filter(Boolean)
            .slice(0, 50)
        : [],
      // Preserve available_locations for filtering (optional - products can exist without locations)
      available_locations: (() => {
        if (!Array.isArray(product.available_locations) || product.available_locations.length === 0) {
          return undefined
        }
        const filtered = product.available_locations.filter((loc: string) => loc != null && loc !== '')
        return filtered.length > 0 ? filtered : undefined
      })(),
      brand: product.brand?.name ? {
        name: product.brand.name,
        handle: product.brand.handle || undefined
      } : undefined,
      // Explicitly preserve final_score to prevent it from being removed
      final_score: typeof product.final_score === 'number' ? product.final_score : 0,
      created_at_timestamp: product.created_at_timestamp,
      metadata: undefined,
      raw_calculated_amount: undefined,
      raw_original_amount: undefined
    }

    optimized.description = product.description ? product.description.substring(0, 500) : null
    optimized.subtitle = product.subtitle ? product.subtitle.substring(0, 200) : null

    Object.keys(optimized).forEach(key => {
      if (optimized[key] === undefined) {
        delete optimized[key]
      }
    })

    return sanitizeNullishValues(optimized)
  })
}

function sanitizeNullishValues(value: any): any {
  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((item) => sanitizeNullishValues(item))
      .filter((item) => item !== undefined);

    return cleanedArray.length ? cleanedArray : undefined;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const cleaned = sanitizeNullishValues(val as any);
        return [key, cleaned] as const;
      })
      .filter(([, cleaned]) => cleaned !== undefined);

    if (!entries.length) {
      return undefined;
    }

    return Object.fromEntries(entries);
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return undefined;
  }

  return value;
}


