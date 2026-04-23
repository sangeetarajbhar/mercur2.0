import { isPresent, MedusaError } from "@medusajs/framework/utils"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  transformSingleProductImageUrlsWithMultipleResolutions,
  wrapVariantsWithSellerInventory,
  filterSellersByLocationAvailability,
  dataNormalization
} from '../../../../utils/middlewares'
import { wrapVariantsWithSellerPricing } from '../../../../utils/middlewares'
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  refetchProduct,
  RequestWithContext,
  wrapProductsWithTaxPrices,
  addWishlistFlagToProducts,
} from "../../../products/helpers"
import { HttpTypes } from "@medusajs/framework/types"
import stockLocationSellerLink from "@mercurjs/core-plugin/links/stock-location-seller-link"
import { calculateProductPromotions } from '../../../product-list/utils/calculate-product-promotions'
import { Modules } from '@medusajs/framework/utils'

import {
  fetchPdpCrossLinks,
  PdpSectionResults,
} from '../utils/pdp-sections'
import { formatPromotionSavingsText } from "../../../../../shared/utils/validate-promotion-restrictions"
import { resolveClusterContext } from "../utils/cluster-context"
import { fetchSellerLocationLinks } from "../utils/seller-location-links"

export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductParams>,
  res: MedusaResponse<HttpTypes.StoreProductResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // seller_id, cluster_id, and resolution are extracted from filterableFields
  // so they never reach the DB query via ...otherFilters.
  const {
    seller_id,
    cluster_id,
    resolution,
    variant_id: variantIdFilter,
    ...otherFilters
  } = req.filterableFields

  // Parse resolution parameter - can be comma-separated like "2x,3x,4x"
  const resolutionParam = (req.query?.resolution || resolution) as string | undefined
  const requestedResolutions = resolutionParam
    ? resolutionParam.split(',').map(r => r.trim()).filter(Boolean)
    : undefined

  // Validate cluster_id
  if (!cluster_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `cluster_id must be provided`)
  }

  const {
    darkStoreLocationId,
    darkStoreWithChildrenStockLocation,
  } = await resolveClusterContext(query, cluster_id as string)

  // Step 1: Check seller-stock location relationship (only if seller_id is provided)
  if (seller_id && cluster_id) {
    const sellerLocationLinks = await fetchSellerLocationLinks(
      query,
      seller_id as string,
      darkStoreWithChildrenStockLocation,
      darkStoreLocationId
    )

    if (!sellerLocationLinks.length) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Seller is not linked to this cluster stock location`)
    }
  }

  // Field processing - need to keep this for proper field handling
  const withInventoryQuantity = req.queryConfig.fields.some((field) =>
    field.includes("variants.inventory_quantity")
  )

  // Filter out inventory_quantity field but keep other field processing
  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes("variants.inventory_quantity")
    )
  }

  const filters: object = {
    id: req.params.id,
    ...otherFilters,
  }

  if (isPresent(req.pricingContext)) {
    filters["context"] = {
      "variants.calculated_price": { context: req.pricingContext },
    }
  }

  // Ensure configurations are included in the fields for returnable_days
  let fieldsWithConfigurations = req.queryConfig.fields.includes("*configurations")
    ? [...req.queryConfig.fields]
    : [...req.queryConfig.fields, "*configurations"];

  fieldsWithConfigurations = fieldsWithConfigurations.filter((field) => {
    // keep variant options
    if (
      field.startsWith("variants.options") ||
      field.startsWith("*variants.options")
    ) {
      return true
    }

    // drop any product-level options fields
    return !field.startsWith("options") && !field.startsWith("*options")
  })


  // Fetch product and options in parallel
  const productPromise = refetchProduct(
    filters,
    req.scope,
    fieldsWithConfigurations
  )

  const optionsPromise = req.scope
    .resolve(Modules.PRODUCT)
    .listProductOptions(
      { product_id: req.params.id },
      { relations: ["values"] }
    )

  const [product, options] = await Promise.all([productPromise, optionsPromise])

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id: ${req.params.id} was not found`
    )
  }
  if(options?.length > 0) {
    (product as any).options = options || []
  }

  // Filter sellers to only show those available in the location
  await filterSellersByLocationAvailability(
    req,
    product,
    {
      location_ids: darkStoreWithChildrenStockLocation,
      seller_id: seller_id as string,
    }
  )

  // Add seller_inventory object to each variant for all sellers
  await wrapVariantsWithSellerInventory(
      req.scope,
      product.variants, 
      {
        location_ids: darkStoreWithChildrenStockLocation,
        seller_ids: product.sellers?.map((seller: any) => seller.id) || [ seller_id as string ],
      }
  )
  

  // console.log("product", product);

  // Step 2: First calculate all seller prices to determine minimum price seller
  const initialExtraData = {
    // seller_id: undefined, // Don't filter by seller initially to get all seller prices
    location_ids: darkStoreWithChildrenStockLocation,
    // filterToSingleSeller: false, // Never filter in the initial call
    seller_ids: product.sellers?.map((seller: any) => seller.id) || [ seller_id as string ],
  };

  // console.log("initialExtraData", initialExtraData);
  // console.log("product.variants", product.variants);
  // console.dir(req.pricingContext, { depth : null });


  await wrapVariantsWithSellerPricing(req.scope, product.variants, req.pricingContext, initialExtraData);

  await wrapProductsWithTaxPrices(req, [product])

  // Add min_variant_id and other sorting data using dataNormalization
  await dataNormalization(req, [product]);

  const selectedSellerId =
    (seller_id as string | undefined) ||
    (() => {
      const minPriceVariantId = (product as any).min_price_variant_id
      if (!minPriceVariantId) {
        return undefined
      }

      const minPriceVariant = product.variants?.find(
        (variant: any) => variant.id === minPriceVariantId
      )

      return minPriceVariant?.calculated_price?.min_price_seller_id
    })()

  // Transform relative image paths to full URLs with multiple resolutions for frontend consumption
  transformSingleProductImageUrlsWithMultipleResolutions(product, requestedResolutions);

  if (req.auth_context?.actor_id) {
    await addWishlistFlagToProducts(req as AuthenticatedMedusaRequest, [product])
  }

  // Step 6.5: Calculate best promotion for the product
  type PromotionDetails = {
    code: string;
    original_price: number;
    discounted_price: number;
    discount_percentage: number;
    savings_amount: number;
    savings_text: string | null;
    promo_prefix: string;
    variant_id: string | null;
  };

  let promotionInfo: PromotionDetails | null = null;
  const variantPromotionMap = new Map<string, PromotionDetails | null>();

  const variantIdFromQuery =
    (req.query?.variant_id as string | undefined) ||
    (req.query?.variantId as string | undefined) ||
    (req.query?.variant as string | undefined) ||
    (variantIdFilter as string | undefined);

  const normalizeId = (value?: string) => value?.trim() || undefined;
  const normalizedVariantId = normalizeId(variantIdFromQuery);

  const findVariantForPromotion = () => {
    if (!product.variants?.length) {
      return undefined;
    }

    if (normalizedVariantId) {
      const directMatch = product.variants.find(
        (variant) => variant.id === normalizedVariantId
      );

      if (directMatch) {
        return directMatch;
      }

      const skuMatch = product.variants.find(
        (variant) => variant.sku === normalizedVariantId
      );

      if (skuMatch) {
        return skuMatch;
      }
    }

    return product.variants[0];
  };

  const promotionVariant = findVariantForPromotion();

  // Get price from selected seller's price in seller_prices, fallback to calculated_price
  // This ensures we use the correct seller's price even when filterToSingleSeller is false
  const getVariantPriceForSeller = (variant: any, sellerId?: string): number => {
    if (!variant?.calculated_price) return 0;

    // First try to get price from seller_prices for the selected seller
    if (sellerId && variant.calculated_price.seller_prices?.[sellerId]) {
      return variant.calculated_price.seller_prices[sellerId].calculated_amount || 0;
    }

    // Fallback to main calculated_price (works when filterToSingleSeller was true)
    return variant.calculated_price.calculated_amount || 0;
  };

  const selectedVariantPrice = getVariantPriceForSeller(promotionVariant, selectedSellerId);

  const fallbackMinVariantPrice = product.variants?.reduce((min, variant) => {
    const variantPrice = getVariantPriceForSeller(variant, selectedSellerId);
    return variantPrice > 0 && variantPrice < min ? variantPrice : min;
  }, Infinity);

  const promotionBasePrice =
    selectedVariantPrice > 0
      ? selectedVariantPrice
      : fallbackMinVariantPrice && fallbackMinVariantPrice !== Infinity
        ? fallbackMinVariantPrice
        : 0;

  // Use min variant price for product-level promotion so it matches PLP (same logic: min price → same eligible promos and same "best" code).
  const priceForProductLevelPromo =
    fallbackMinVariantPrice != null &&
    fallbackMinVariantPrice !== Infinity &&
    fallbackMinVariantPrice > 0
      ? fallbackMinVariantPrice
      : promotionBasePrice;

  if (priceForProductLevelPromo > 0) {
    const customerId = req.auth_context?.actor_id;
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const promotionResults = await calculateProductPromotions(
      [{
        id: product.id,
        variant_id: promotionVariant?.id ?? null,
        price_asc: priceForProductLevelPromo,
        title: product.title || product.handle || null,
        // Needed so seller-based promos can be evaluated on PDP without `cart_id`.
        seller_id: selectedSellerId ?? null,
      }],
      req.scope,
      customerId,
      undefined,
      query
    );

    const productPromotion = promotionResults[0];

    if (productPromotion?.best_promotion_code) {
      const discountedPrice = productPromotion.discounted_price ?? productPromotion.original_price;
      const discountAmount = productPromotion.discount_amount ?? Math.max(
        0,
        productPromotion.original_price - discountedPrice
      );
      const discountPercentage = Math.round(
        (discountAmount / productPromotion.original_price) * 100
      );

      promotionInfo = {
        code: productPromotion.best_promotion_code,
        original_price: productPromotion.original_price,
        discounted_price: discountedPrice,
        discount_percentage: discountPercentage,
        savings_amount: Math.max(
          0,
          Math.round(
            (productPromotion.original_price - discountedPrice) * 100
          ) / 100
        ),
        savings_text: formatPromotionSavingsText(productPromotion),
        promo_prefix: "Get it for",
        variant_id: promotionVariant?.id || null
      };
    }
  }

  // Calculate promotions for each variant individually
  // Use the same helper function to get price from selected seller's seller_prices
  const variantPromotionInputs = (product.variants || []).map((variant: any) => {
    const variantPrice = getVariantPriceForSeller(variant, selectedSellerId);
    const price = typeof variantPrice === "number" ? variantPrice : 0;

    return {
      variant,
      price,
    };
  });

  const variantLookup = new Map<string, any>(
    variantPromotionInputs.map(({ variant }) => [variant.id, variant])
  );

  const variantPromotionRequests = variantPromotionInputs
    .filter(({ price }) => price > 0)
    .map(({ variant, price }) => ({
      id: product.id,
      variant_id: variant.id,
      price_asc: price,
      title:
        variant.title ||
        variant.sku ||
        product.title ||
        product.handle ||
        null,
      // We already computed `price` for this selected seller, so reuse it as seller context.
      seller_id: selectedSellerId ?? null,
    }));

  if (variantPromotionRequests.length > 0) {
    const customerId = req.auth_context?.actor_id;
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const variantPromotionResults = await calculateProductPromotions(
      variantPromotionRequests,
      req.scope,
      customerId,
      undefined,
      query
    );

    variantPromotionResults.forEach((promotionResult) => {
      const variantId = promotionResult.variant_id ?? null;

      if (!variantId) {
        return;
      }

      const targetVariant = variantLookup.get(variantId);

      if (!targetVariant) {
        return;
      }

      const promotionCode = (promotionResult.best_promotion_code || "").trim();
      if (!promotionCode) {
        variantPromotionMap.set(targetVariant.id, null);
        return;
      }

      const originalPrice = promotionResult.original_price || 0;
      const discountedPrice =
        promotionResult.discounted_price ?? originalPrice;
      const discountAmount =
        promotionResult.discount_amount ||
        Math.max(0, originalPrice - discountedPrice);
      const discountPercentage =
        originalPrice > 0
          ? Math.round((discountAmount / originalPrice) * 100)
          : 0;
      const promotionDetails: PromotionDetails = {
        code: promotionCode,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount_percentage: discountPercentage,
        savings_amount: Math.max(
          0,
          Math.round((originalPrice - discountedPrice) * 100) / 100
        ),
        savings_text: formatPromotionSavingsText(promotionResult),
        promo_prefix: "Get it for",
        variant_id: variantId ?? null,
      };

      variantPromotionMap.set(targetVariant.id, promotionDetails);
    });
  }

  if (product.variants?.length) {
    for (const variant of product.variants) {
      const promotionDetails =
        variantPromotionMap.has(variant.id)
          ? variantPromotionMap.get(variant.id)
          : null;

      (variant as any).promotion = promotionDetails || null;
    }
  }

  // Step 7: Add returnable days display message if product has configuration
  if (product.product_configuration) {
    const config = product.product_configuration;
    if (config.returnable_days !== undefined && config.returnable_days !== null) {
      const days = parseInt(String(config.returnable_days));
      let displayMessage = '';

      if (days === 0) {
        displayMessage = 'Non-returnable';
      } else {
        displayMessage = `Standard Delivery with ${days} days returns.`;
      }

      product.product_configuration.returnable_days_message = displayMessage;
    }
  }

  // Step 8: Build core PDP response
  const response: HttpTypes.StoreProductResponse & {
    product: HttpTypes.StoreProduct & {
      selected_seller_id: string;
      promotion?: {
        code: string;
        original_price: number;
        discounted_price: number;
        discount_percentage: number;
        savings_amount: number;
        savings_text: string | null;
        variant_id: string | null;
      } | null;
    };
  } & PdpSectionResults = {
    product: {
      ...product,
      selected_seller_id: selectedSellerId,
      promotion: promotionInfo,
    },
    crossLinks: [],
  };

  // Step 9: Always provide PDP cross-links (empty array when no mapping is possible)
  const sectionResults = await fetchPdpCrossLinks(product, {  similarLimit: 15 ,relatedLimit: 8 })
  Object.assign(response, sectionResults)

  res.json(response)
}
