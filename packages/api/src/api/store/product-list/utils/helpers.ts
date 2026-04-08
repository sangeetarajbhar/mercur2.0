import { AlgoliaModuleService } from '@mercurjs/algolia'
import type { SearchResponse } from "algoliasearch"
import { formatPromotionSavingsText } from '../../../../shared/utils/validate-promotion-restrictions'

export interface FilterParams {
  collection_name?: string | null
  minPrice?: string
  maxPrice?: string
  locationIds: string | string[]
  rest: Record<string, string>
}

export interface FacetProcessingParams {
  facetsMap: Record<string, any>
  disjunctiveFacetKeys: Set<string>
  facetFilters: string[][]
  numericFilters: string[]
  query: string
  sort?: string
  algoliaService: AlgoliaModuleService
  disjunctiveFacetsMap?: Map<string, string[]> // Pre-fetched disjunctive facet results
}

/**
 * Build facet filters from query parameters
 */
export function buildFacetFilters(params: FilterParams): {
  facetFilters: string[][]
  numericFilters: string[]
  disjunctiveFacetKeys: Set<string>
} {
  const { collection_name, minPrice, maxPrice, locationIds, rest } = params
  
  const facetFilters: string[][] = []
  const disjunctiveFacetKeys = new Set<string>()

  // Add collection filter
  if (collection_name?.trim()) {
    facetFilters.push([`_collections:${collection_name.trim()}`])
  }

  // Handle price range filtering using numeric filters
  const numericFilters: string[] = []
  if (minPrice) {
    numericFilters.push(`price_asc >= ${Number(minPrice)}`)
  }
  if (maxPrice) {
    numericFilters.push(`price_asc <= ${Number(maxPrice)}`)
  }

  // Handle location filtering (mandatory)
  const locationArray = Array.isArray(locationIds) ? locationIds : locationIds.split(",").map(v => v.trim())
  const locationFilters = locationArray.map(locationId => `available_locations:${locationId}`)
  facetFilters.push(locationFilters)

  // Process rest of the filters
  for (const [key, value] of Object.entries(rest)) {
    if (!key || !value || key === 'minPrice' || key === 'maxPrice' || key === 'locationIds') continue
    
    let values = Array.isArray(value) ? value : value.split(",").map(v => v.trim())
    
    if (key === 'filters.attribute' || key === 'attribute') {
      const attributeFilters = values.map(v => `categories.attributes.name:${v}`)
      facetFilters.push(attributeFilters)
      continue
    }
    
    if (key === 'id' || key === 'objectID') {
      facetFilters.push(values.map(v => `id:${v}`))
      continue
    }
    
    const filterKey = key.startsWith('filters.') ? key : `filters.${key}`

    if (filterKey === 'filters.gender') {
      values = values.map(v => {
        const normalized = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
        // If Unisex is selected, expand to both Men and Women
        if (normalized === 'Unisex') {
          return ['Men', 'Women']
        }
        return normalized
      }).flat()
    }
    
    facetFilters.push(values.map(v => `${filterKey}:${v}`))
  }

  return { facetFilters, numericFilters, disjunctiveFacetKeys }
}

/**
 * Remove facet filters for a specific key (used for disjunctive faceting)
 */
export function removeFacetFiltersForKey(filters: string[][], targetKey: string): string[][] {
  if (!filters || !filters.length) {
    return []
  }

  return filters.reduce<string[][]>((acc, group) => {
    const filteredGroup = group.filter(filterValue => !filterValue.startsWith(`${targetKey}:`))
    if (filteredGroup.length) {
      acc.push(filteredGroup)
    }
    return acc
  }, [])
}

/**
 * Format facet label for display
 */
export function formatFacetLabel(key: string): string {
  if (key.startsWith('filters.')) {
    const attributeName = key.replace('filters.', '')
    return attributeName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const lastPart = key.split('.').pop() ?? key
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1)
}

/**
 * Remove ALL disjunctive filter facets except mandatory ones (location, collection)
 */
function removeAllDisjunctiveFilters(
  filters: string[][], 
  disjunctiveKeys: Set<string>
): string[][] {
  if (!filters || !filters.length) {
    return []
  }

  return filters.reduce<string[][]>((acc, group) => {
    // Keep the filter group if none of its values start with any disjunctive key
    const filteredGroup = group.filter(filterValue => {
      // Check if this filter belongs to any disjunctive key
      const isDisjunctive = Array.from(disjunctiveKeys).some(key => 
        filterValue.startsWith(`${key}:`)
      )
      return !isDisjunctive
    })
    
    if (filteredGroup.length > 0) {
      acc.push(filteredGroup)
    }
    return acc
  }, [])
}

/**
 * Batch fetch disjunctive facets using multi-search (optimized)
 */
async function batchFetchDisjunctiveFacets(
  disjunctiveKeys: string[],
  params: FacetProcessingParams
): Promise<Map<string, string[]>> {
  if (disjunctiveKeys.length === 0) {
    return new Map()
  }

  const { facetFilters, numericFilters, query, sort, algoliaService, disjunctiveFacetKeys } = params
  
  // Use Algolia's multi-search to batch all disjunctive facet queries
  const searches = disjunctiveKeys.map(key => {
    // Remove ALL disjunctive filters, keeping only mandatory filters (location, collection)
    const baseFilters = removeAllDisjunctiveFilters(facetFilters, disjunctiveFacetKeys)
    
    return {
      indexName: sort || "products",
      params: {
        query,
        page: 0,
        hitsPerPage: 0,
        facets: [key],
        ...(baseFilters.length > 0 && { facetFilters: baseFilters }),
        ...(numericFilters.length > 0 && { numericFilters })
      }
    }
  })

  // Make single batched request
  const batchResults = await (algoliaService as any).algolia_.search(searches)
  
  const facetMap = new Map<string, string[]>()
  disjunctiveKeys.forEach((key, index) => {
    const result = batchResults.results[index]
    const facetValuesObj = result?.facets?.[key]
    const facetValues = facetValuesObj ? Object.keys(facetValuesObj as Record<string, number>) : []
    if (facetValues.length > 0) {
      facetMap.set(key, facetValues)
    }
  })

  return facetMap
}

/**
 * Process facets and return filter data (optimized with batched multi-search)
 */
export async function processFacets(params: FacetProcessingParams): Promise<{ label: string; value: string; options: string[] }[]> {
  const { facetsMap, disjunctiveFacetKeys } = params

  const skipFacetKeys = new Set([
    'categories.attributes.is_filterable',
    'categories.attributes.name',
    'categories.attributes.value',
    'categories.attributes.handle',
    'categories.attributes.id',
    'categories.attributes.ui_component'
  ])

  // Build set of keys to process efficiently
  const facetKeysToProcess = new Set<string>()
  
  // Add keys from facets map
  for (const key of Object.keys(facetsMap)) {
    if (!skipFacetKeys.has(key)) {
      facetKeysToProcess.add(key)
    }
  }

  // Add disjunctive facet keys
  for (const key of disjunctiveFacetKeys) {
    if (!skipFacetKeys.has(key)) {
      facetKeysToProcess.add(key)
    }
  }

  // Use pre-fetched disjunctive results if available, otherwise fetch them
  let disjunctiveFacetsMap: Map<string, string[]>;
  
  if (params.disjunctiveFacetsMap) {
    // Use pre-fetched results from the optimized multi-search
    disjunctiveFacetsMap = params.disjunctiveFacetsMap;
  } else {
    // Fallback: Batch fetch all disjunctive facets in a separate multi-search call
    const disjunctiveKeysToFetch = Array.from(disjunctiveFacetKeys).filter(
      key => !skipFacetKeys.has(key)
    );
    disjunctiveFacetsMap = await batchFetchDisjunctiveFacets(disjunctiveKeysToFetch, params);
  }

  // Process all facets
  const facetKeysArray = Array.from(facetKeysToProcess)
  const facetDataResults = facetKeysArray.map((key) => {
    // Use disjunctive facet results if available, otherwise use regular facets
    let options = disjunctiveFacetsMap.has(key)
      ? disjunctiveFacetsMap.get(key)!
      : facetsMap[key]
        ? Object.keys(facetsMap[key] as Record<string, number>)
        : []

    // Filter out "Unisex" from gender filter options
    if (key === 'filters.gender') {
      options = options.filter(opt => opt.toLowerCase() !== 'unisex')
    }

    if (!options.length) {
      return null
    }

    return {
      label: formatFacetLabel(key),
      value: `${key}`,
      options,
    }
  })

  // Filter out null results and build response
  const filterData = facetDataResults.filter((item): item is { label: string; value: string; options: string[] } => item !== null)

  // Add attribute facet if available
  const attributeFacetKey = 'categories.attributes.name'
  const attributeFacetValues = facetsMap[attributeFacetKey]
    ? Object.keys(facetsMap[attributeFacetKey] as Record<string, number>).filter(Boolean).sort()
    : []

  if (attributeFacetValues.length > 0) {
    filterData.push({
      label: "attribute",
      value: "filters.attribute",
      options: attributeFacetValues
    })
  }

  return filterData
}

/**
 * Build filters for price range calculation (excludes price filters)
 */
export function buildFiltersForPriceRange(params: FilterParams): string[][] {
  const { collection_name, locationIds, rest } = params
  
  const filtersForPriceRange: string[][] = []

  if (collection_name?.trim()) {
    filtersForPriceRange.push([`_collections:${collection_name.trim()}`])
  }
  
  // Add mandatory location filter
  const locationArray = Array.isArray(locationIds) ? locationIds : locationIds.split(",").map(v => v.trim())
  const locationFilters = locationArray.map(locationId => `available_locations:${locationId}`)
  filtersForPriceRange.push(locationFilters)
  
  // Add all non-price filters
  for (const [key, value] of Object.entries(rest)) {
    if (!key || !value || key === 'minPrice' || key === 'maxPrice' || key === 'locationIds') continue
    
    let values = Array.isArray(value) ? value : value.split(",").map(v => v.trim())
    
    if (key === 'filters.attribute' || key === 'attribute') {
      const attributeFilters = values.map(v => `categories.attributes.name:${v}`)
      filtersForPriceRange.push(attributeFilters)
      continue
    }
    
    if (key === 'id' || key === 'objectID') {
      filtersForPriceRange.push(values.map(v => `id:${v}`))
      continue
    }
    
    const filterKey = key.startsWith('filters.') ? key : `filters.${key}`
    
    // Normalize gender values
    if (key === 'filters.gender' || key === 'gender') {
      values = values.map(v => {
        const normalized = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
        // If Unisex is selected, expand to both Men and Women
        if (normalized === 'Unisex') {
          return ['Men', 'Women']
        }
        return normalized
      }).flat()
    }
    
    filtersForPriceRange.push(values.map(v => `${filterKey}:${v}`))
  }

  return filtersForPriceRange
}

/**
 * Get price range from Algolia using facet stats (optimized - no product hits needed)
 */
export async function getPriceRange(
  algoliaService: AlgoliaModuleService,
  query: string,
  filtersForPriceRange: string[][]
): Promise<{ min: number; max: number }> {
  // Use facet stats to get min/max without fetching products
  const result = await algoliaService.searchIndex(
    query || "*",
    0,
    0,  // Don't fetch any products - we only need facet stats
    "products",
    undefined,
    filtersForPriceRange.length > 0 ? filtersForPriceRange : undefined,
    ['price_asc'],  // Request facet stats for price_asc
    []
  ) as SearchResponse<any>

  // Extract min/max from facet stats if available
  const facetStats = result.facets_stats?.price_asc
  if (facetStats) {
    return {
      min: Math.floor(facetStats.min || 0),
      max: Math.ceil(facetStats.max || 0)
    }
  }

  // Fallback to 0 if no stats available
  return { min: 0, max: 0 }
}

/**
 * Transform product with promotions
 */
export function transformProductWithPromotion(
  product: any,
  query: string,
  promotionInfo?: { original_price: number; discounted_price: number; discount_amount: number; best_promotion_code?: string | null; promo_code_upper_limit?: number } | null
) {
  const matchingVariants = (product.variants || []).filter((v: any) =>
    v.searchKey?.toLowerCase().includes(query.toLowerCase())
  )

  const promotion = promotionInfo ? (() => {
    const originalPrice = promotionInfo.original_price || 0
    const discountedPrice = promotionInfo.discounted_price ?? originalPrice
    const discountAmount = promotionInfo.discount_amount ?? Math.max(
      0,
      Math.round((originalPrice - discountedPrice) * 100) / 100
    )
    const savingsAmount = Math.max(
      0,
      Math.round((originalPrice - discountedPrice) * 100) / 100
    )
    const discountPercentage = originalPrice > 0
      ? Math.round((discountAmount / originalPrice) * 100)
      : 0
    const savingsText = formatPromotionSavingsText(promotionInfo)

    return {
      code: promotionInfo.best_promotion_code || null,
      original_price: originalPrice,
      discounted_price: discountedPrice,
      discount_percentage: discountPercentage,
      savings_amount: savingsAmount,
      savings_text: savingsText,
    }
  })() : null

  return {
    ...product,
    matchingVariants,
    promotion
  }
}

