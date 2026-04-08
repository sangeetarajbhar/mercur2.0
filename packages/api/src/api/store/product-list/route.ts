import { MedusaResponse } from '@medusajs/framework'
import { RequestWithContext, transformProductImageUrlsWithResolutionForPLP } from "../products/helpers"
import { transformSingleProductImageUrlsForPLP } from "../../utils/middlewares/products/transform-image-urls"
import { HttpTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import customerWishlist from "../../../links/customer-wishlist"

import { ALGOLIA_MODULE } from '@mercurjs/algolia'
import { AlgoliaModuleService } from '@mercurjs/algolia'
import type { SearchResponse } from "algoliasearch"
import {
  calculateProductPromotions,
  listingSellerIdFromProductPayload,
} from "./utils/calculate-product-promotions"
import {
  buildFacetFilters,
  // buildFiltersForPriceRange,
  processFacets,
  // getPriceRange,
  transformProductWithPromotion
} from "./utils/helpers"
import { calculateProductListPromises } from "./utils/calculate-product-list-promises"
import {
  fetchZoneByPincode,
  fetchZoneIdByLocationId
} from "../../../workflows/delivery-promise/steps/cart-promise/fetch-zone-by-pincode"

/**
 * Extract price range from facet stats in search result
 */
function extractPriceRangeFromFacetStats(result: SearchResponse<any>): { min: number; max: number } {
  const facetStats = result.facets_stats?.price_asc;

  if (facetStats && typeof facetStats.min === 'number' && typeof facetStats.max === 'number') {
    return {
      min: facetStats.min,
      max: facetStats.max
    };
  }

  // Fallback: calculate from hits if facet stats not available
  let minPrice = Infinity;
  let maxPrice = 0;

  if (result.hits && result.hits.length > 0) {
    for (const product of result.hits) {
      if (product.price_asc && product.price_asc > 0) {
        if (product.price_asc < minPrice) {
          minPrice = product.price_asc;
        }
      }

      const productMaxPrice = product.price_max || product.price_asc;
      if (productMaxPrice && productMaxPrice > maxPrice) {
        maxPrice = productMaxPrice;
      }
    }
  }

  return {
    min: minPrice === Infinity ? 0 : minPrice,
    max: maxPrice
  };
}

// Build PLP-specific promise message without affecting other apis
function buildPlpPromiseMessage(promise: {
  delivery_type?: 'instant' | 'slotted' | null
  delivery_minutes?: number | null
  message?: string
  slot_date?: string
} | undefined | null): string | null {
  if (!promise || !promise.delivery_type) {
    return null
  }

  const { delivery_type, delivery_minutes, message, slot_date } = promise

  // Helper to normalize a date to start-of-day for comparison
  const toStartOfDay = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const now = new Date()
  const today = toStartOfDay(now)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const deliveryDate =
    slot_date && !Number.isNaN(Date.parse(slot_date))
      ? toStartOfDay(new Date(slot_date))
      : null

  const isToday = deliveryDate && deliveryDate.getTime() === today.getTime()
  const isTomorrow =
    deliveryDate && deliveryDate.getTime() === tomorrow.getTime()

  // Instant delivery: always show "<minutes> mins"
  if (delivery_type === 'instant') {
    if (typeof delivery_minutes === 'number' && delivery_minutes > 0) {
      return `${delivery_minutes} mins`
    }
    return null
  }

  if (delivery_type === 'slotted') {
    if (typeof message !== 'string' || message.length === 0) {
      return null
    }
    // Tomorrow's slot: "Delivery Tomorrow  7 PM - 10 PM" → "Tom, 7 PM - 10 PM"
    if (isTomorrow) {
      return message.replace(/Delivery\s+Tomorrow\s*/i, 'Tom ')
    }
    // Today's slot: "Delivery Today  7 PM - 10 PM" → "7 PM - 10 PM"
    if (isToday) {
      return message.replace(/(?:Delivery\s+)?Today\s*,?\s*/i, '').trim()
    }
    // Other dates: reuse backend message as-is
    return message
  }

  return null
}

/**
 * Perform optimized search with main query + disjunctive facets in single multi-search
 */
async function performOptimizedSearch(params: {
  query: string;
  pageNum: number;
  hitsPerPageNum: number;
  sort?: string;
  facetFilters: string[][];
  numericFilters: string[];
  disjunctiveFacetKeys: Set<string>;
  algoliaService: any;
}): Promise<{ mainResult: SearchResponse<any>; disjunctiveFacetsMap: Map<string, string[]> }> {
  const { query, pageNum, hitsPerPageNum, sort, facetFilters, numericFilters, disjunctiveFacetKeys, algoliaService } = params;

  // Build base filters (without any disjunctive filters)
  const baseFilters = facetFilters.filter(group => {
    return !group.some(filterValue => {
      return Array.from(disjunctiveFacetKeys).some(key => filterValue.startsWith(`${key}:`))
    })
  })

  // Build multi-search queries
  const searches: any[] = [
    // Main product search (with all filters)
    {
      indexName: sort || "products",
      params: {
        query,
        page: pageNum,
        hitsPerPage: hitsPerPageNum,
        facets: ["variants.searchKey", "price_asc", "*"],
        facetingAfterDistinct: false,
        ...(facetFilters.length > 0 && { facetFilters }),
        ...(numericFilters.length > 0 && { numericFilters })
      }
    }
  ];

  // Add disjunctive facet queries (one per selected filter, without all disjunctive filters)
  Array.from(disjunctiveFacetKeys).forEach(key => {
    searches.push({
      indexName: sort || "products",
      params: {
        query,
        page: 0,
        hitsPerPage: 0,
        facets: [key],
        ...(baseFilters.length > 0 && { facetFilters: baseFilters }),
        ...(numericFilters.length > 0 && { numericFilters })
      }
    });
  });

  // Execute all queries in a single network call
  const results = await (algoliaService as any).algolia_.search(searches);

  // Extract main result
  const mainResult = results.results[0];

  // Extract disjunctive facet results
  const disjunctiveFacetsMap = new Map<string, string[]>();
  Array.from(disjunctiveFacetKeys).forEach((key, index) => {
    const result = results.results[index + 1]; // +1 because main query is at index 0
    const facetValuesObj = result?.facets?.[key];
    const facetValues = facetValuesObj ? Object.keys(facetValuesObj as Record<string, number>) : [];
    if (facetValues.length > 0) {
      disjunctiveFacetsMap.set(key, facetValues);
    }
  });

  return { mainResult, disjunctiveFacetsMap };
}

export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse
) => {
  try {
    const {
      query = "*",
      page = "0",
      hitsPerPage = "20",
      sort,
      minPrice,
      maxPrice,
      resolution,
      locationIds,
      pincode,
      collection_name,
      ...rest
    } = req.query as Record<string, string>;

    if (!locationIds || (typeof locationIds === 'string' && locationIds.trim() === '')) {
      return res.status(400).json({
        message: "Location filter is required. Please provide locationIds parameter.",
        error: "LOCATION_REQUIRED"
      });
    }

    const algoliaService = req.scope.resolve<AlgoliaModuleService>(ALGOLIA_MODULE);
    const pageNum = Number(page);
    const hitsPerPageNum = Number(hitsPerPage);

    const defaultSortData = [
      { label: "Recommended", value: "products_by_custom_score", is_active: true },
      { label: "Price (Low to High)", value: "products_price_asc", is_active: true },
      { label: "Price (High to Low)", value: "products_price_desc", is_active: true },
      { label: "Newest Arrivals", value: "products_newest", is_active: true },
      { label: "Discount", value: "products_discount_desc", is_active: true },
      { label: "Most Popular", value: "products_by_popularity", is_active: false },
    ];

    // Build filters - only pass parameters that are actually defined
    const filterParams: any = {
      locationIds,
      rest
    };
    if (collection_name) filterParams.collection_name = collection_name;
    if (minPrice) filterParams.minPrice = minPrice;
    if (maxPrice) filterParams.maxPrice = maxPrice;

    const { facetFilters, numericFilters, disjunctiveFacetKeys } = buildFacetFilters(filterParams);

    // Build price range filters (needed for parallel execution)
    const priceRangeParams: any = {
      locationIds,
      rest
    };
    if (collection_name) priceRangeParams.collection_name = collection_name;


    ///sanggggg
    // const filtersForPriceRange = buildFiltersForPriceRange(priceRangeParams);

    // This reduces everything to 1 network round-trip!
    const { mainResult, disjunctiveFacetsMap } = await performOptimizedSearch({
      query,
      pageNum,
      hitsPerPageNum,
      sort,
      facetFilters,
      numericFilters,
      disjunctiveFacetKeys,
      algoliaService
    });

    // Extract data from the single response
    const paginatedResult = mainResult; // Has products
    const facetsResult = mainResult;    // Has all facet counts

    // Extract price range from facet stats (if available)
    const priceRange = extractPriceRangeFromFacetStats(mainResult);

    // Process facets (now with pre-fetched disjunctive results)
    const filterData = await processFacets({
      facetsMap: facetsResult.facets || {},
      disjunctiveFacetKeys,
      facetFilters,
      numericFilters,
      query,
      sort,
      algoliaService,
      disjunctiveFacetsMap // Pass pre-fetched results
    });

    // Prepare product data for parallel processing
    const products = paginatedResult.hits || [];
    const productsForPromotionCalc = products.map((product: any) => ({
      id: product.id,
      price_asc: product.price_asc || 0,
      title:
        product.title ||
        product.name ||
        product.product_title ||
        product.product_name ||
        null,
      // Needed so seller-based promos can be evaluated on PLP without `cart_id`.
      seller_id: listingSellerIdFromProductPayload(product) ?? null,
    }));

    const customerId = req.auth_context?.actor_id;
    const queryService = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    // Run wishlist and promotions in parallel if user is authenticated
    const [promotionResults, wishlistIds] = await Promise.all([
      // Calculate promotions (pass queryService so tier filtering can be applied)
      calculateProductPromotions(
        productsForPromotionCalc,
        req.scope,
        customerId,
        undefined,
        queryService
      ),

      // Get wishlist if authenticated
      req.auth_context?.actor_id && "hits" in paginatedResult
        ? getWishlistProductIds(req)
        : Promise.resolve(new Set<string>())
    ]);

    const promotionMap = new Map(
      promotionResults.map(p => [p.product_id, p])
    );

    // Get zone and location for promise calculation: prefer pincode (same as home/cart), else fall back to locationIds
    let zone_id: string | null = null
    let promiseLocationId: string | null = null

    if (pincode?.trim()) {
      const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
      const zone = await fetchZoneByPincode(pincode.trim(), knex)
      if (zone) {
        zone_id = zone.id
        promiseLocationId = zone.location_id
      }
    }

    if (!zone_id || !promiseLocationId) {
      const locationArray = Array.isArray(locationIds) ? locationIds : locationIds.split(",").map(v => v.trim())
      const clusterId = locationArray[0]
      zone_id = await fetchZoneIdByLocationId(clusterId, req.scope)
      promiseLocationId = zone_id ? clusterId : null
    }

    // Calculate promises using zone_id and zone's location (from pincode) or cluster from locationIds
    const promiseMap =
      zone_id && promiseLocationId
        ? await calculateProductListPromises({
            scope: req.scope,
            products,
            zone_id,
            cluster_id: promiseLocationId
          })
        : new Map()

    // Transform products with promotions, image URLs, wishlist flags, and promises
    const hitsWithVariants = products.map((product: any) => {
      transformProductImageUrlsWithResolutionForPLP(
        product,
        resolution,
        transformSingleProductImageUrlsForPLP
      );

      const promotionInfo = promotionMap.get(product.id);
      const transformed = transformProductWithPromotion(product, query, promotionInfo);

      // Add wishlist flag
      if (wishlistIds.size > 0) {
        transformed.in_wishlist = wishlistIds.has(product.id);
      }

      // Add promise
      const promise = promiseMap.get(product.id)
      if (promise) {
        transformed.promise = promise

        // PLP-only formatted message (does not affect Home/Product/Cart)
        const plpMessage = buildPlpPromiseMessage(promise as any)
        if (plpMessage) {
          ; (transformed as any).promise_plp_message = plpMessage
        }
      }

      return transformed;
    });

    const responseData: any = {
      products: hitsWithVariants,
      count: paginatedResult.nbHits,
      offset: (paginatedResult.page ?? 0) * hitsPerPageNum,
      limit: hitsPerPageNum,
      sortData: defaultSortData,
      filterData,
      priceRange: {
        min: priceRange.min,
        max: priceRange.max,
        currentMin: minPrice ? Number(minPrice) : priceRange.min,
        currentMax: maxPrice ? Number(maxPrice) : priceRange.max
      }
    };

    res.status(200).json(responseData);

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get wishlist product IDs for a customer (optimized)
 */
const getWishlistProductIds = async (
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
): Promise<Set<string>> => {
  if (!req.auth_context?.actor_id) {
    return new Set<string>();
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: wishlists } = await query.graph({
    entity: customerWishlist.entryPoint,
    fields: ["wishlist.products.id"],
    filters: {
      customer_id: req.auth_context.actor_id,
    }
  });

  return new Set(
    wishlists.flatMap((w: any) =>
      (w.wishlist.products || [])
        .map((p: any) => p?.id)
        .filter(Boolean)
    )
  );
};