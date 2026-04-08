// src/api/utils/middlewares/products/variant-seller-pricing.ts
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PriceListType
} from "@medusajs/framework/utils"
import sellerPriceList from "../../../../links/seller-price-list"
import sellerProduct from "../../../../links/seller-product"
import { Context, MedusaContainer } from "@medusajs/framework/types"
import { groupBy, deduplicate } from "@medusajs/utils"
import { isPresent } from "@medusajs/utils"
import { MathBN } from "@medusajs/utils"
import priceExtendLink from "../../../../links/price-extend-price"
import sellerStockLocation from "../../../../links/seller-stock-location"

/**
 * Get sellers that are mapped to both the specified locations AND products (intersection)
 */
async function getValidSellersForLocationAndProducts(
  container: MedusaContainer,
  locationIds?: string[],
  productIds?: string[]
): Promise<string[]> {
  if (!locationIds?.length && !productIds?.length) {
    return [] // No filtering criteria provided
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  let locationMappedSellers: string[] = []
  let productMappedSellers: string[] = []

  try {
    // Get all sellers mapped to the specified locations
    if (locationIds?.length) {
      const { data: sellerLocationMappings } = await query.graph({
        entity: sellerStockLocation.entryPoint,
        fields: ['seller_id', 'stock_location_id'],
        filters: {
          stock_location_id: { $in: locationIds }
        }
      })
      locationMappedSellers = [...new Set(sellerLocationMappings.map((mapping: any) => mapping.seller_id))]
    }

    // Get all sellers mapped to the specified products
    if (productIds?.length && locationMappedSellers.length > 0) {
      const { data: sellerProductMappings } = await query.graph({
          entity: sellerProduct.entryPoint,
          fields: ['seller_id', 'product_id'],
          filters: {
            product_id: { $in: productIds },
            seller_id: { $in: locationMappedSellers } /// location locationn seller filter to product to get valida seller
          }
        },
        {
          cache: {
            enable: true
          }
        })
      productMappedSellers = [...new Set(sellerProductMappings.map((mapping: any) => mapping.seller_id))]
    }

    // // Find intersection of sellers (mapped to BOTH locations AND products)
    // let validSellers: string[] = []

    // if (locationIds?.length && productIds?.length) {
    //   // Both criteria exist - find intersection
    //   validSellers = locationMappedSellers.filter(sellerId =>
    //     productMappedSellers.includes(sellerId)
    //   )
    // } else if (locationIds?.length) {
    //   // Only location criteria
    //   validSellers = locationMappedSellers
    // } else if (productIds?.length) {
    //   // Only product criteria
    //   validSellers = productMappedSellers
    // }

    if (locationIds?.length && productIds?.length) {
      // Both criteria exist - find intersection
      return productMappedSellers;
    } else if (locationIds?.length && !productIds?.length) {
      // Only location criteria
      return locationMappedSellers;
    } else if (productIds?.length) {
      // Only product criteria
      return productMappedSellers;
    }

    return []

  } catch (error) {
    console.error('Error getting valid sellers:', error)
    return []
  }
}

/**
 * Validate that a seller's price list contains only SKUs mapped to them
 * and that the seller is mapped to the specified locations (cluster + child locations)
 */
async function validatePriceListSkuMapping(
  container: MedusaContainer,
  sellerId: string,
  priceListId: string,
  contextProductIds?: string[],
  locationIds?: string[]
): Promise<boolean> {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)


    // Get all prices from this price list
    const { data: prices } = await query.graph({
      entity: 'price',
      fields: ['id', 'price_set_id'],
      filters: {
        price_list_id: priceListId
      }
    })

    if (!prices.length) {
      return true // Empty price list is valid
    }

    // Get price set IDs from prices
    const priceSetIds = [...new Set(prices.map((p: any) => p.price_set_id).filter(Boolean))]

    if (!priceSetIds.length) {
      return true // No price sets means no validation needed
    }

    // Step 1: Validate location mapping if locationIds are provided
    if (locationIds && locationIds.length > 0) {
      try {
        // Check if the seller is mapped to any of the specified locations (cluster + child locations)
        const { data: sellerLocationMappings } = await query.graph({
          entity: sellerStockLocation.entryPoint,
          fields: ['seller_id', 'stock_location_id'],
          filters: {
            seller_id: sellerId,
            stock_location_id: { $in: locationIds }
          }
        })

        // If seller is not mapped to any of the specified locations, exclude them
        if (!sellerLocationMappings.length) {
          return false
        }

      } catch (locationError) {
        console.error('Location validation error:', locationError)
        return false
      }
    }

    // Step 2: Validate product mapping if contextProductIds are provided
    if (contextProductIds && contextProductIds.length > 0) {
      // Check if the seller is mapped to the specific products in context
      const { data: sellerProductMappings } = await query.graph({
        entity: sellerProduct.entryPoint,
        fields: ['product_id'],
        filters: {
          seller_id: sellerId,
          product_id: { $in: contextProductIds }
        }
      })

      const mappedProductIds = sellerProductMappings.map((mapping: any) => mapping.product_id)

      // Check if the seller is mapped to ALL products in the context
      const allProductsMapped = contextProductIds.every(productId =>
        mappedProductIds.includes(productId)
      )

      return allProductsMapped
    }

    // Step 3: Fallback - Check if seller has any product mappings at all
    const { data: allSellerProductMappings } = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: ['product_id'],
      filters: {
        seller_id: sellerId
      }
    })

    // If seller has no product mappings at all, they shouldn't have any price lists
    return allSellerProductMappings.length > 0

  } catch (error) {
    console.error('Error validating price list SKU mapping:', error)
    return false
  }
}

type PricingFilters = {
  id: string[]
}

type PricingContext = {
  context?: Record<string, unknown>
}

type VariantInput = {
  id: string
  calculated_price?: any
}

type CustomData = {
  seller_id?: string,
  location_ids?: string[]
}

type ExtraData = {
  seller_id?: string,
  location_ids?: string[],
  filterToSingleSeller?: boolean  // Flag to indicate if seller_prices should be filtered to single seller
}

// Custom implementation of calculatePrices function
async function calculatePrices(
  container: MedusaContainer,
  pricingRepository: any,
  priceRuleService: any,
  pricePreferenceService: any,
  pricingFilters: PricingFilters,
  pricingContext: PricingContext = { context: {} },
  customData: CustomData,
  sharedContext: Context = {},
  contextProductIds?: string[],
  locationIds?: string[],
  validSellers?: string[]
): Promise<any[]> {
  const results = await pricingRepository.calculatePrices(
    pricingFilters,
    pricingContext,
    sharedContext
  )

  // console.log("results ------------------->>>>>>>>>>>", results);

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date();

  const pricesSetPricesMap = groupBy(results, "price_set_id")


  const pricesSetPricesPriceListMap = new Map();

  // OPTIMIZATION: Collect all price_list_ids from ALL price sets BEFORE the loop
  const allPriceListIds = new Set<string>();
  for (const [, prices] of pricesSetPricesMap) {
    for (const price of prices) {
      if (price.price_list_id !== null) {
        allPriceListIds.add(price.price_list_id);
      }
    }
  }

  // OPTIMIZATION: Fetch ALL seller price list links in ONE query (outside the loop)
  let allActiveSellerPriceListLinks: any[] = [];
  if (allPriceListIds.size > 0) {
    const filters: Record<string, unknown> = {
      price_list_id: Array.from(allPriceListIds)
    }


    // If specific seller_id is provided in the customData, filter by it
    if (customData.seller_id) {
      filters.seller_id = customData.seller_id
    }


    const sellerPriceListLinks = await query.graph({
      entity: sellerPriceList.entryPoint,
      fields: [
        'seller_id',
        'price_list_id',
        'price_list.id',
        'price_list.status',
        'price_list.starts_at',
        'price_list.ends_at',
        'price_list.created_at'
      ],
      filters
    })

    // Filter to only active price lists with valid date ranges
    allActiveSellerPriceListLinks = sellerPriceListLinks.data.filter((link: any) => {
      const { status, starts_at, ends_at } = link.price_list;
      const isActive = status === "active";
      const isWithinDateRange =
        (!starts_at || new Date(starts_at) <= now) &&
        (!ends_at || new Date(ends_at) >= now);
      return isActive && isWithinDateRange;
    });

  }

  for (const [priceSetId, prices] of pricesSetPricesMap) {
    const groupedByPriceListId = {};

    // Get price_list_ids for this specific price set
    const priceListIds = new Set();
    for (const price of prices) {
      if (price.price_list_id !== null) {
        priceListIds.add(price.price_list_id);
      }
    }

    // OPTIMIZATION: Filter the pre-fetched data instead of querying again
    const activeSellerPriceLists = allActiveSellerPriceListLinks.filter((link: any) => {
      return priceListIds.has(link.price_list_id);
    });

    const priceListsBySeller = new Map<string, any[]>()

    // if (sellerPriceListLinks?.data?.length) {
    //   sellerPriceListLinks.data.forEach((link: any) => {
    //     if (!priceListsBySeller.has(link.seller_id)) {
    //       priceListsBySeller.set(link.seller_id, [])
    //     }
    //     priceListsBySeller.get(link.seller_id).push(link.price_list_id)
    //   })
    // }

    // activeSellerPriceLists.forEach((link: any) => {
    //   if (!priceListsBySeller.has(link.seller_id)) {
    //     priceListsBySeller.set(link.seller_id, []);
    //   }
    //   priceListsBySeller.get(link.seller_id).push(link.price_list);
    // });

    // Get sellers that are mapped to BOTH locations AND products (intersection)
    // const validSellers = await getValidSellersForLocationAndProducts(container, locationIds, contextProductIds);

    // Filter active seller price lists to only include valid sellers (intersection)
    const filteredActiveSellerPriceLists = activeSellerPriceLists.filter((link: any) => {
      return customData.seller_id ? link.seller_id === customData.seller_id : validSellers?.includes(link.seller_id);
    });

    // Build the price lists map with only valid sellers
    for (const link of filteredActiveSellerPriceLists) {
      const sellerId = link.seller_id;
      const priceList = link.price_list;

      // Additional validation for price list content (optional)
      // const isValidPriceList = await validatePriceListSkuMapping(container, sellerId, priceList.id, contextProductIds, locationIds);

      // if (isValidPriceList) {
      if (!priceListsBySeller.has(sellerId)) {
        priceListsBySeller.set(sellerId, []);
      }
      priceListsBySeller.get(sellerId)!.push(priceList);
      // }
    }

    for (const [sellerId, priceLists] of priceListsBySeller.entries()) {
      // Sort by created_at descending and pick the first (latest)
      priceLists.sort((a, b) => {
        const dateA = new Date(a.created_at ?? 0).getTime();
        const dateB = new Date(b.created_at ?? 0).getTime();
        return dateB - dateA;
      });
      priceListsBySeller.set(sellerId, [priceLists[0]]);
    }

    if(priceListsBySeller){
      for (const sellerId of priceListsBySeller.keys()) {
        groupedByPriceListId[sellerId] = [];
      }
    }

    for (const price of prices) {
      const priceListId = price.price_list_id || null;

      if(!priceListsBySeller.size){
        pricesSetPricesPriceListMap.set(priceSetId, [price]);
      }else{
        // for (const [sellerId, sellerPriceLists] of priceListsBySeller.entries()) {
        //   if (sellerPriceLists.includes(priceListId) || !priceListId) {
        //     groupedByPriceListId[sellerId].push(price);
        //   }
        // }
        for (const [sellerId, sellerPriceLists] of priceListsBySeller.entries()) {
          // sellerPriceLists is now an array with a single latest price list object
          const latestPriceList = sellerPriceLists[0];
          if ((latestPriceList && priceListId === latestPriceList.id) || !priceListId) {
            groupedByPriceListId[sellerId].push(price);
          }
        }
      }

    }

    // if (Object.keys(groupedByPriceListId).length) {
    //   pricesSetPricesPriceListMap.set(priceSetId, groupedByPriceListId);
    // }
    if (Object.keys(groupedByPriceListId).length) {
      pricesSetPricesPriceListMap.set(priceSetId, groupedByPriceListId);
    } else {
      pricesSetPricesPriceListMap.set(priceSetId, null); // or {}
    }
  }

  const priceIds: string[] = []

  pricesSetPricesPriceListMap.forEach(
    (pricesPriceListData: any[], setkey) => {

      if (!pricesPriceListData) {
        // Handle the case where there is no price list data for this price set
        // For example, you can skip or set a default value
        return;
      }

      // console.log('key --- 77: ',setkey);
      // console.dir(pricesPriceListData, { depth: null });

      Object.entries(pricesPriceListData).forEach(
        ([Listkey, prices]) => {

          const pricesArr = Array.isArray(prices) ? prices : [];
          const priceListPrice = pricesArr.find((p) => p.price_list_id)
          const defaultPrice = pricesArr?.find((p) => !p.price_list_id)

          if (!pricesArr.length || (!priceListPrice && !defaultPrice)) {
            delete pricesSetPricesPriceListMap[setkey][Listkey]
            return
          }

          let calculatedPrice: any | undefined = defaultPrice
          let originalPrice: any | undefined = defaultPrice

          /**
           * When deciding which price to use we follow the following logic:
           * - If the price list is of type OVERRIDE, we always use the price list price.
           * - If the price list is of type SALE, we use the lowest price between the price list price and the default price
           */
          if (priceListPrice) {
            switch (priceListPrice.price_list_type) {
              case PriceListType.OVERRIDE:
                calculatedPrice = priceListPrice
                originalPrice = priceListPrice
                break
              case PriceListType.SALE: {
                let lowestPrice = priceListPrice

                if (defaultPrice?.amount && priceListPrice.amount) {
                  lowestPrice = MathBN.lte(
                    priceListPrice.amount,
                    defaultPrice.amount
                  )
                    ? priceListPrice
                    : defaultPrice
                }

                calculatedPrice = lowestPrice
                break
              }
            }
          }
          // console.log('setkey',setkey);
          // console.log('Listkey',Listkey);
          // console.log('calculatedPrice',calculatedPrice);
          // console.log('originalPrice',originalPrice);
          // console.log('pricesSetPricesPriceListMap[setkey]',pricesSetPricesPriceListMap);
          const priceListData = pricesSetPricesPriceListMap.get(setkey);

          if (priceListData && priceListData[Listkey]) {
            priceListData[Listkey] = { calculatedPrice, originalPrice };
          }
          priceIds.push(
            ...(deduplicate(
              [calculatedPrice?.id, originalPrice?.id].filter(Boolean)
            ) as string[])
          )
          //   }
          // )

        })
    })

  // console.log('Price set prices map:', );
  // console.dir(Object.fromEntries(pricesSetPricesPriceListMap), { depth: null });
  // console.log('priceIds:', priceIds);

  // We use the price rules to get the right preferences for the price
  const priceRulesForPrices = await priceRuleService.list(
    { price_id: priceIds },
    {}
  )

  const priceRulesPriceMap = groupBy(priceRulesForPrices, "price_id")

  // Note: For now the preferences are intentionally kept very simple and explicit - they use either the region or currency,
  // so we hard-code those as the possible filters here. This can be made more flexible if needed later on.
  const pricingPreferences = await pricePreferenceService.list(
    {
      $or: Object.entries(pricingContext.context || {})
        .filter(([key]) => {
          return key === "region_id" || key === "currency_code"
        })
        .map(([key, val]) => ({
          attribute: key,
          value: val,
        })),
    },
    {},
    sharedContext
  )
  // console.log('pricingFilters', pricingFilters  );
  const calculatedPrices: any[] =
    pricingFilters.id
      .map((priceSetId: string): any | null => {
        // const sellerPrices = pricesSetPricesPriceListMap.get(priceSetId)
        // if (!sellerPrices) {
        //   return null
        // }

        const sellerPrices = pricesSetPricesPriceListMap.get(priceSetId)
        if (!sellerPrices) {
          return { [priceSetId]: null }
        }
        // console.log('sellerPrices', sellerPrices);

        const sellersPriceObj = Object.entries(sellerPrices).reduce(
          (acc: any, [sellerId, prices]) => {
            const {
              calculatedPrice,
              originalPrice,
            } = prices as {
              calculatedPrice: any | undefined
              originalPrice: any | undefined
            }

            // console.log('calculatedPrice', calculatedPrice);
            // console.log('originalPrice', originalPrice);

            acc[sellerId] = {
              id: priceSetId,
              is_calculated_price_price_list: !!calculatedPrice?.price_list_id,
              is_calculated_price_tax_inclusive: isTaxInclusive(
                priceRulesPriceMap.get(calculatedPrice.id),
                pricingPreferences,
                calculatedPrice.currency_code!,
                pricingContext.context?.region_id as string
              ),
              calculated_amount: isPresent(calculatedPrice?.amount)
                ? parseFloat(calculatedPrice?.amount as string)
                : null,
              raw_calculated_amount: calculatedPrice?.raw_amount || null,

              is_original_price_price_list: !!originalPrice?.price_list_id,
              is_original_price_tax_inclusive: originalPrice?.id
                ? isTaxInclusive(
                  priceRulesPriceMap.get(originalPrice.id),
                  pricingPreferences,
                  originalPrice.currency_code || calculatedPrice.currency_code!,
                  pricingContext.context?.region_id as string
                )
                : false,
              original_amount: isPresent(originalPrice?.amount)
                ? parseFloat(originalPrice?.amount as string)
                : null,
              raw_original_amount: originalPrice?.raw_amount || null,

              currency_code: calculatedPrice?.currency_code || null,

              calculated_price: {
                id: calculatedPrice?.id || null,
                price_list_id: calculatedPrice?.price_list_id || null,
                price_list_type: calculatedPrice?.price_list_type || null,
                min_quantity:
                  parseInt(calculatedPrice?.min_quantity || "") || null,
                max_quantity:
                  parseInt(calculatedPrice?.max_quantity || "") || null,
              },

              original_price: {
                id: originalPrice?.id || null,
                price_list_id: originalPrice?.price_list_id || null,
                price_list_type: originalPrice?.price_list_type || null,
                min_quantity: parseInt(originalPrice?.min_quantity || "") || null,
                max_quantity: parseInt(originalPrice?.max_quantity || "") || null,
              },
            }

            return acc
          },
          {}
        )

        return {
          [priceSetId]: sellersPriceObj,
        }
      })
      .filter(Boolean) as any[]

  // console.log('calculatedPrices', calculatedPrices);

  return JSON.parse(JSON.stringify(calculatedPrices))
}

/**
 * Fetch discount percentages for given price IDs using the link to ExtendPrice
 */
async function getPriceDiscounts(container: any, priceIdsArray: string[]) {
  if (!priceIdsArray.length) return {}

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const pricesWithDiscount = await query.graph({
    entity: priceExtendLink.entryPoint,
    fields: ["extend_price.percentage_discount", "price_id"],
    filters: { price_id: { $in: priceIdsArray } }
  })

  const discountMap: Record<string, number | null> = {}

  pricesWithDiscount.data.forEach((p: any) => {
    // Map the price_id to its discount percentage
    const priceId = p.price_id || p.price?.id
    const discount = p.extend_price?.percentage_discount ?? null

    if (priceId) {
      discountMap[priceId] = discount
    }
  })

  return discountMap
}

/**
 * Create fallback seller prices using variant's calculated_price when no price lists exist
 */
async function createFallbackSellerPrices(
  container: MedusaContainer,
  variants: any[],
  variantToPriceSetMap: Map<string, string>,
  validSellers?: string[]
): Promise<any[]> {
  // const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {

    // // Step 1: Get product IDs for all variants
    // const variantIds = variants.map(v => v.id)
    // const variantDetails = await query.graph({
    //   entity: 'product_variant',
    //   fields: ['id', 'product_id'],
    //   filters: { id: { $in: variantIds } }
    // })

    // const productIds: string[] = []
    // const variantToProductMap = new Map()

    // variantDetails.data.forEach((variant: any) => {
    //   if (variant.product_id) {
    //     variantToProductMap.set(variant.id, variant.product_id)
    //     if (!productIds.includes(variant.product_id)) {
    //       productIds.push(variant.product_id)
    //     }
    //   }
    // })

    // if (!productIds.length) {
    //   return []
    // }

    // // Step 2: Get sellers for these products using direct seller-product link
    // const productToSellersMap = await getSellersForProducts(container, productIds)

    // Step 3: Create fallback prices for each variant-seller combination
    const fallbackPrices = variants.map((variant: any) => {
      const priceSetId = variantToPriceSetMap.get(variant.id)
      if (!priceSetId || !variant.calculated_price) {
        return null
      }

      // const productId = variantToProductMap.get(variant.id)
      // const sellersForProduct = productToSellersMap[productId] || []

      // // Filter sellers based on validSellers if provided
      // const filteredSellers = validSellers && validSellers.length > 0
      //   ? sellersForProduct.filter((sellerId: string) => validSellers.includes(sellerId))
      //   : sellersForProduct

      const sellerPrices: any = {}

      // filteredSellers.forEach((sellerId: string) => {
      validSellers?.forEach((sellerId: string) => {
        sellerPrices[sellerId] = {
          id: priceSetId,
          is_calculated_price_price_list: false,
          is_calculated_price_tax_inclusive: false,
          calculated_amount: variant.calculated_price.original_amount || variant.calculated_price.calculated_amount || null,
          raw_calculated_amount: variant.calculated_price.raw_original_amount || variant.calculated_price.raw_calculated_amount || null,
          is_original_price_price_list: false,
          is_original_price_tax_inclusive: false,
          original_amount: variant.calculated_price.original_amount || variant.calculated_price.calculated_amount || null,
          raw_original_amount: variant.calculated_price.raw_original_amount || variant.calculated_price.raw_calculated_amount || null,
          currency_code: variant.calculated_price.currency_code || 'inr',
          calculated_price: {
            id: null,
            price_list_id: null,
            price_list_type: null,
            min_quantity: null,
            max_quantity: null,
          },
          original_price: {
            id: null,
            price_list_id: null,
            price_list_type: null,
            min_quantity: null,
            max_quantity: null,
          }
        }
      })

      return { [priceSetId]: sellerPrices }
    }).filter(Boolean)

    return fallbackPrices

  } catch (error) {
    console.error('Error creating fallback seller prices:', error)
    return []
  }
}

/**
 * Merge price list data with fallback prices to ensure all sellers have pricing
 */
async function mergeWithFallbackPrices(
  priceListPrices: any[],
  fallbackPrices: any[]
): Promise<any[]> {
  // Create a map to easily merge the data by priceSetId
  const mergedPricesMap = new Map()

  // First, add all fallback prices (all sellers with calculated_price)
  fallbackPrices.forEach((fallbackEntry: any) => {
    const priceSetId = Object.keys(fallbackEntry)[0]
    if (priceSetId && fallbackEntry[priceSetId]) {
      mergedPricesMap.set(priceSetId, { ...fallbackEntry[priceSetId] })
    }
  })

  // Then, overlay price list prices (seller-by-seller, not replacing the whole object)
  priceListPrices.forEach((priceListEntry: any) => {
    const priceSetId = Object.keys(priceListEntry)[0]
    if (priceSetId && priceListEntry[priceSetId]) {
      const existingSellerPrices = mergedPricesMap.get(priceSetId) || {}
      const priceListSellerPrices = priceListEntry[priceSetId]

      // Merge seller by seller - price list data overrides fallback for specific sellers
      const mergedSellerPrices = { ...existingSellerPrices }
      Object.keys(priceListSellerPrices).forEach(sellerId => {
        mergedSellerPrices[sellerId] = priceListSellerPrices[sellerId]
      })

      mergedPricesMap.set(priceSetId, mergedSellerPrices)
    }
  })

  // Convert back to the expected format
  const result: any[] = []
  mergedPricesMap.forEach((sellerPrices, priceSetId) => {
    result.push({ [priceSetId]: sellerPrices })
  })

  return result
}

/**
 * Get sellers linked to products using direct seller-product link
 */
async function getSellersForProducts(
  container: MedusaContainer,
  productIds: string[]
): Promise<Record<string, string[]>> {
  if (!productIds.length) return {}

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Query seller-product links directly
    const sellerProductLinks = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: [
        'seller_id',
        'product_id',
        'seller.store_status'
      ],
      filters: {
        product_id: { $in: productIds },
        deleted_at: {
          $eq: null
        }
      }
    })

    // Create mapping from product to sellers (filter for ACTIVE sellers only)
    const productToSellersMap: Record<string, string[]> = {}

    sellerProductLinks.data.forEach((link: any) => {
      const productId = link.product_id
      const sellerId = link.seller_id
      const sellerStatus = link.seller?.store_status

      if (productId && sellerId && sellerStatus === 'ACTIVE') {
        if (!productToSellersMap[productId]) {
          productToSellersMap[productId] = []
        }
        if (!productToSellersMap[productId].includes(sellerId)) {
          productToSellersMap[productId].push(sellerId)
        }
      }
    })

    return productToSellersMap

  } catch (error) {
    console.error('Error in getSellersForProducts:', error)
    return {}
  }
}

// Helper function for tax inclusivity check
function isTaxInclusive(
  priceRules: any[] = [],
  pricingPreferences: any[] = [],
  currencyCode: string,
  regionId?: string
): boolean {
  // Default to false if no rules or preferences
  if (!priceRules?.length && !pricingPreferences?.length) {
    return false
  }

  // Check price rules first
  if (priceRules?.length) {
    const taxInclusiveRule = priceRules.find(
      (rule) => rule.rule_attribute === "tax_inclusive"
    )
    if (taxInclusiveRule) {
      return taxInclusiveRule.rule_value === "true"
    }
  }

  // Then check preferences
  if (pricingPreferences?.length) {
    // Check region-specific preference
    if (regionId) {
      const regionPreference = pricingPreferences.find(
        (pref) =>
          pref.attribute === "region_id" &&
          pref.value === regionId &&
          pref.settings?.tax_inclusive !== undefined
      )
      if (regionPreference) {
        return regionPreference.settings.tax_inclusive
      }
    }

    // Check currency-specific preference
    const currencyPreference = pricingPreferences.find(
      (pref) =>
        pref.attribute === "currency_code" &&
        pref.value === currencyCode &&
        pref.settings?.tax_inclusive !== undefined
    )
    if (currencyPreference) {
      return currencyPreference.settings.tax_inclusive
    }
  }

  return false
}

export const wrapVariantsWithSellerPricing = async (
  container: MedusaContainer,
  variants: VariantInput[],
  priceContext: any,
  extraData?: ExtraData
) => {
  if (!variants?.length) {
    return
  }

  const variantIds = variants.map((variant) => variant.id)

  // Extract product IDs from variants for validation context
  const productIds = [...new Set(variants.map((variant: any) => variant.product_id).filter(Boolean))]

  // console.log('variantIds --- 25: ');
  // console.dir(variantIds, { depth: null });

  // Get the container and necessary services
  // const container = req.scope
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricingService = container.resolve(Modules.PRICING)

  try {
    // Step 1: Get price set IDs for the variants
    const variantPriceSetLinks = await query.graph({
      entity: 'product_variant_price_set',
      fields: ['variant_id', 'price_set_id'],
      filters: {
        variant_id: variantIds
      }
    })

    if (!variantPriceSetLinks?.data?.length) {
      return
    }

    // console.log("variantPriceSetLinks", variantPriceSetLinks);

    // Create a map of variant_id -> price_set_id
    const variantToPriceSetMap = new Map()
    variantPriceSetLinks.data.forEach((link: any) => {
      variantToPriceSetMap.set(link.variant_id, link.price_set_id)
    })

    // Step 4: For each variant, calculate prices for each seller
    const priceSetIds = Array.from(variantToPriceSetMap.values())

    // Get the original pricing context from the request
    const originalPricingContext = {
      ...(priceContext ?? {}),
      currency_code: "inr"
    }

    // Create a clean default pricing context without price lists
    const defaultPricingContext = {
      ...(originalPricingContext ?? {}),
      currency_code: "inr"
    }
    delete (defaultPricingContext as any).price_list_id

    // Get all price set IDs we need to calculate prices for
    const uniquePriceSetIds = Array.from(new Set(priceSetIds))

    // Get necessary services for our custom calculatePrices function
    const pricingRepository = (pricingService as any).pricingRepository_
    const priceRuleService = (pricingService as any).priceRuleService_
    const pricePreferenceService = (pricingService as any).pricePreferenceService_


    const validSellers = await getValidSellersForLocationAndProducts(container, extraData?.location_ids, productIds)


    // Calculate default prices (without price lists)
    const defaultPrices = await calculatePrices(
      container,
      pricingRepository,
      priceRuleService,
      pricePreferenceService,
      { id: uniquePriceSetIds },
      { context: defaultPricingContext },
      extraData || {},
      {},
      productIds,
      extraData?.location_ids,
      validSellers
    )

    // Create hybrid pricing: combine price list data with fallback prices for missing sellers
    // Get valid sellers for fallback pricing (intersection of location + product mappings)
    // const validSellersForFallback = await getValidSellersForLocationAndProducts(container, extraData?.location_ids, productIds)
    // const fallbackPrices = await createFallbackSellerPrices(container, variants, variantToPriceSetMap, validSellersForFallback)
    const fallbackPrices = await createFallbackSellerPrices(container, variants, variantToPriceSetMap, validSellers)
    const finalPrices = await mergeWithFallbackPrices(defaultPrices, fallbackPrices)

    // Step 5: Collect all price IDs to fetch percentage discounts
    const allPriceIds: string[] = []
    for (const priceEntry of finalPrices) {
      const priceSetId = Object.keys(priceEntry)[0]
      const sellerPrices = priceEntry[priceSetId]

      if (sellerPrices) {
        Object.values(sellerPrices).forEach((sellerPrice: any) => {
          if (sellerPrice.calculated_price?.id) {
            allPriceIds.push(sellerPrice.calculated_price.id)
          }
          if (sellerPrice.original_price?.id) {
            allPriceIds.push(sellerPrice.original_price.id)
          }
        })
      }
    }

    // Get percentage discounts for all price IDs
    const uniquePriceIds = [...new Set(allPriceIds)]
    const discountMap = await getPriceDiscounts(container, uniquePriceIds)

    // Now update each variant with seller-specific prices including percentage discounts
    for (const variant of variants) {
      if (!variant.calculated_price) {
        continue
      }

      const priceSetId = variantToPriceSetMap.get(variant.id)
      if (!priceSetId) {
        continue
      }
      // Get the price for this variant (either from price lists or fallback)
      const variantPriceEntry = finalPrices.find(
        (price: any) => Object.keys(price)[0] === priceSetId
      )
      const sellerVariantPrice = variantPriceEntry?.[priceSetId]
      if (!sellerVariantPrice) {
        continue
      }
      // Add percentage_of_discount to each seller's price data
      const enhancedSellerPrices: any = {}
      let minPrice = Infinity
      let minPriceSellerId: string | null = null

      Object.entries(sellerVariantPrice).forEach(([sellerId, sellerPrice]: [string, any]) => {
        const calculatedPriceId = sellerPrice.calculated_price?.id
        // console.log("calculatedPriceId", calculatedPriceId);
        const percentageDiscount = calculatedPriceId ? discountMap[calculatedPriceId] : null

        enhancedSellerPrices[sellerId] = {
          ...sellerPrice,
          percentage_of_discount: percentageDiscount
        }

        // Track minimum price and seller ID
        const currentPrice = sellerPrice.calculated_amount
        if (currentPrice && currentPrice < minPrice) {
          minPrice = currentPrice
          minPriceSellerId = sellerId
        }
      })

      // Filter seller prices only if explicitly requested via filterToSingleSeller flag
      let finalSellerPrices = enhancedSellerPrices
      let finalMinPriceSellerId: string | null = minPriceSellerId
      let updatedCalculatedPrice = { ...variant.calculated_price }

      if (extraData?.filterToSingleSeller && extraData?.seller_id) {
        const targetSellerId = extraData.seller_id

        // Only include the specified seller if it exists in the prices
        if (enhancedSellerPrices[targetSellerId]) {
          finalSellerPrices = {
            [targetSellerId]: enhancedSellerPrices[targetSellerId]
          }
          finalMinPriceSellerId = targetSellerId

          // Update main calculated_price to match the filtered seller's pricing
          const targetSellerPrice = enhancedSellerPrices[targetSellerId]
          updatedCalculatedPrice = {
            ...variant.calculated_price,
            calculated_amount: targetSellerPrice.calculated_amount,
            raw_calculated_amount: targetSellerPrice.raw_calculated_amount,
            original_amount: targetSellerPrice.original_amount,
            raw_original_amount: targetSellerPrice.raw_original_amount,
            is_calculated_price_price_list: targetSellerPrice.is_calculated_price_price_list,
            is_calculated_price_tax_inclusive: targetSellerPrice.is_calculated_price_tax_inclusive,
            calculated_price: targetSellerPrice.calculated_price,
            currency_code: targetSellerPrice.currency_code
          }
        } else {
          // If the specified seller doesn't have pricing data, return empty seller_prices
          finalSellerPrices = {}
          finalMinPriceSellerId = null
        }
      }

      // Replace the calculated_price with seller-specific prices including discounts and min price seller
      variant.calculated_price = {
        ...updatedCalculatedPrice,
        seller_prices: finalSellerPrices,
        min_price_seller_id: finalMinPriceSellerId
      }

      // console.log("finalSellerPrices", finalSellerPrices);
      // console.log("finalMinPriceSellerId", finalMinPriceSellerId);
      // console.log("updatedCalculatedPrice", updatedCalculatedPrice);
    }
    return variants

  } catch (error) {
    console.error('Error in wrapVariantsWithSellerPricing:', error);
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to get variant pricing by seller: ${error.message}`
    )
  }
}
