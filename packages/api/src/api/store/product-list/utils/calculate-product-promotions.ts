import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { Knex } from "knex";
import { getPromotionRulesWithCache, getActivePromotionsEnriched, type PromotionRulesCache } from "../../../../shared/utils/promotion-cache";
import { isFirstCustomer } from "../../../../shared/utils/check-first-customer";
import { checkPerCustomerCampaignUsage } from "../../../../shared/utils/check-per-customer-usage";
import { roundToTwoDecimals } from "../../../../shared/utils/calculate-discount-amount";
import { filterGuestPromotionsByTier, filterPromotionsByTier, filterValidPromotions } from "../../promotions/helpers";

interface ProductInput {
  id: string;
  price_asc: number;
  title?: string;
  variant_id?: string | null;
  /**
   * Optional seller context used for PLP/PDP display.
   * When set, we can evaluate `seller_ids` without needing `cart_id`.
   */
  seller_id?: string | null;
}

export interface PromotionResult {
  product_id: string;
  best_promotion_code: string | null;
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  variant_id?: string | null;
  promo_code_upper_limit?: number;
}

/**
 * Calculate the best promotion for each product
 * 
 * WITHOUT cart_id (product listing / PDP display):
 * - If `seller_id` is provided on the product input, seller-restricted promotions are evaluated against it.
 * - If `seller_id` is missing, seller-restricted promotions are skipped (safety behavior).
 * - Still validates product restrictions if promotion has them
 * - Always tries to recommend SOMETHING if possible
 * - First-customer promotions are visible when no customer token is provided (to encourage sign-up)
 * 
 * WITH cart_id (cart context):
 * - Validates seller restrictions against actual cart sellers
 * - Validates product restrictions
 * - Excludes already applied promotions
 * 
 * @param products Array of products with id and price_asc
 * @param scope MedusaContainer scope
 * @param customerId Optional customer ID for first-customer promotions
 * @param cartId Optional cart ID to enable seller restriction validation
 * @returns Array of promotion results for each product (best applicable promotion or null)
 */
export async function calculateProductPromotions(
  products: ProductInput[],
  scope: any,
  customerId?: string,
  cartId?: string,
  query?: any
): Promise<PromotionResult[]> {
  try {
    const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex;

    // Fetch seller mappings and already applied promotions if cart_id is provided
    const productSellerMap = new Map<string, string>(); // product_id -> seller_id
    const appliedPromotionIds: string[] = [];

    if (cartId) {
      try {
        // Get cart items for the provided products
        const productIds = products.map(p => p.id);
        const cartItems = await knex("cart_line_item")
          .select(["id", "product_id"])
          .where({ cart_id: cartId })
          .whereIn("product_id", productIds)
          .whereNull("deleted_at");

        if (cartItems && cartItems.length > 0) {
          const lineItemIds = cartItems.map(item => item.id);

          // Get seller mappings
          const sellerMappings = await knex("seller_seller_cart_line_item")
            .select(["line_item_id", "seller_id"])
            .whereIn("line_item_id", lineItemIds)
            .whereNull("deleted_at");

          // Build product-seller map (one product can have one seller in cart)
          cartItems.forEach((item: any) => {
            const mapping = sellerMappings.find((m: any) => m.line_item_id === item.id);
            if (mapping) {
              productSellerMap.set(item.product_id, mapping.seller_id);
            }
          });
        }

        // Get already applied promotions
        const appliedPromotions = await knex("cart_promotion")
          .select(["promotion_id"])
          .where({ cart_id: cartId })
          .whereNull("deleted_at");

        appliedPromotionIds.push(...appliedPromotions.map((p: any) => p.promotion_id));
      } catch {
        // Error fetching cart data - continue without cart context
      }
    }

    // Check if customer has previous orders (for first_customer promotions)
    const isFirstTimeCustomer = customerId ? await isFirstCustomer(customerId, scope) : false;

    // Get active promotions with extensions from cache or DB (single read-through)
    let promotions = await getActivePromotionsEnriched(scope);

    // Filter by customer tier — mirrors the /store/promotions route logic so that
    // a Tier-1 customer does not see Tier-2 (or other tier) promotions on PLP.
    // Always resolve query from scope if not provided so tier filtering runs in all callers
    // (route.ts passes it, but yesplz-provider and v2/products do not).
    const resolvedQuery = query || scope.resolve(ContainerRegistrationKeys.QUERY);
    if (customerId) {
      promotions = await filterPromotionsByTier(promotions, customerId, resolvedQuery);
    }else{
      promotions = await filterGuestPromotionsByTier(promotions, resolvedQuery);
    }


    // Ensure we drop any promotions whose campaign window has already expired
    // even if they are still present in the cached active_promotions_enriched list.
    promotions = filterValidPromotions(promotions);

    if (!promotions || promotions.length === 0) {
      return products.map((product) => ({
        product_id: product.id,
        best_promotion_code: null,
        original_price: product.price_asc,
        discounted_price: product.price_asc,
        discount_amount: 0,
      }));
    }

    // Calculate best promotion for each product
    const results: PromotionResult[] = [];

    for (const product of products) {
      let bestPromotion: any = null;
      let maxDiscount = 0;

      for (const promotion of promotions) {
        // Skip if promotion is already applied to cart
        if (appliedPromotionIds.includes(promotion.id)) {
          continue;
        }

        // Skip hidden promotions
        // These coupons won't show on PLP but can still be applied directly if someone knows the code
        if (promotion.promotion_extension?.is_hidden) {
          continue;
        }

        // Campaign date filtering is already done by overridden listPromotions
        // Only check campaign budget if applicable (and only for GLOBAL budgets)
        if (promotion.campaign?.budget) {
          const budget = promotion.campaign.budget;
          const budgetType = budget.type;
          const budgetTypeStr = String(budgetType || '').toLowerCase();
          const isPerCustomerBudget = budgetTypeStr === 'usage_per' || budgetTypeStr === 'spend_per' || budgetTypeStr === 'use_by_attribute';
          
          // For per-customer budgets, global budget.used is just a counter
          // Don't filter out based on global budget - per-customer limits are checked separately
          if (!isPerCustomerBudget) {
            const usedBudget = Number(budget.used) || 0;
            const limitBudget = Number(budget.limit) || 0;

            if (limitBudget > 0 && usedBudget >= limitBudget) {
              continue; // Campaign budget exhausted
            }
          }
        }

        // Check application method exists
        const applicationMethod = promotion.application_method;
        if (!applicationMethod) {
          continue;
        }

        // Check promotion restrictions
        let promotionRules: PromotionRulesCache | null = null;
        try {
          promotionRules = await getPromotionRulesWithCache(promotion.code, scope);

            if (promotionRules) {
            // Verify promotion status from cache matches
            if (promotionRules.status !== "active") {
              continue;
            }

            const allowedSellerIds = promotionRules.seller_ids || [];
            const restrictedProductIds = promotionRules.product_rule_ids || [];

            if (cartId) {
              // CART CONTEXT: Check seller and product restrictions with cart data

              // Check seller restrictions
              if (allowedSellerIds.length > 0) {
                const productSellerId = productSellerMap.get(product.id);

                // If product has a seller in cart, check if it matches allowed sellers
                if (productSellerId && !allowedSellerIds.includes(productSellerId)) {
                  continue; // Skip this promotion - seller not allowed
                }
                // If product doesn't have seller mapping, skip (can't verify seller restriction)
                if (!productSellerId) {
                  continue;
                }
              }

              // Check product restrictions
              if (restrictedProductIds.length > 0) {
                if (!restrictedProductIds.includes(product.id)) {
                  continue; // Skip this promotion - product not in allowed list
                }
              }
            } else {
              // NO CART CONTEXT (PLP/PDP display):
              // Apply seller restrictions only when we can determine the row's seller.
              if (allowedSellerIds.length > 0) {
                const listingSellerId =
                  product.seller_id != null && product.seller_id !== ""
                    ? String(product.seller_id)
                    : undefined

                if (!listingSellerId || !allowedSellerIds.includes(listingSellerId)) {
                  continue
                }
              }

              // Check product restrictions (can still validate these without cart)
              if (restrictedProductIds.length > 0) {
                if (!restrictedProductIds.includes(product.id)) {
                  continue; // Skip THIS promotion - try next one
                }
              }
            }
          }
        } catch {
          // On error, skip this promotion to be safe
          continue;
        }

        // Skip if first_customer requirement not met
        // Only skip if customerId exists AND customer is NOT a first-time customer
        // If no customerId, show the promotion to encourage sign-up/login
        if (
          promotion.promotion_extension?.first_customer &&
          customerId && // Only check if customerId exists
          !isFirstTimeCustomer // And customer is not first-time
        ) {
          continue;
        }

        // Check per-customer campaign budget usage (usage_per / spend_per)
        // Skip if customer has exceeded their per-customer usage limit
        if (customerId) {
          try {
            // Call the standalone utility directly — no Proxy needed
            const usageError = await checkPerCustomerCampaignUsage(promotion.code, customerId, scope);
            if (usageError) {
              // Customer has exceeded their usage limit - skip this promotion
              continue;
            }
          } catch (usageCheckError) {
            // On error, continue to next promotion (fail open)
            console.error(`Error checking per-customer usage for promotion ${promotion.code}:`, usageCheckError);
            continue;
          }
        }

        // Check if product price meets minimum cart subtotal requirement
        // Use extension first, then fall back to cached rules (in case extension link is missing or stale)
        // Use Number() so string values from DB/API don't break comparison (e.g. "500" vs 2499)
        const minFromExtension = Number(promotion.promotion_extension?.cart_sub_total) || 0;
        const minFromCache = Number(promotionRules?.cart_sub_total) || 0;
        const minCartSubtotal = minFromExtension || minFromCache;
        const productPrice = Number(product.price_asc) || 0;
        const skippedByMinCart = minCartSubtotal > 0 && productPrice < minCartSubtotal;

        if (skippedByMinCart) {
          continue; // Product price doesn't meet minimum requirement
        }

        // Skip promotions with target rules - Medusa handles target rule matching
        // (product/collection/category/type/tag) via computeActions, which requires cart context
        // For product listing pages without cart, we can't validate target rules properly
        const targetRules = applicationMethod.target_rules || [];
        if (targetRules.length > 0) {
          // Medusa handles target rule matching in computeActions, skip for PLP
          continue;
        }

        // Skip promotions with cart rules - Medusa handles cart rule validation via computeActions
        const cartRules = Array.isArray(applicationMethod.rules) ? applicationMethod.rules : [];
        if (cartRules.length > 0) {
          // Medusa handles cart rule validation (e.g., currency matching) in computeActions
          continue;
        }

        // For product listing, we can only show promotions without target/cart rules
        // Medusa's computeActions handles discount calculation, allocation, and quantity limits
        // Here we do a simple calculation for display purposes only (not for actual application)
        let discountAmount = 0;

        if (applicationMethod.type === "percentage") {
          const percentage = applicationMethod.value || 0;

          // Ensure percentage is valid (0-100)
          if (percentage <= 0 || percentage > 100) {
            continue; // Invalid percentage
          }
          
          // Simple calculation for display - actual discount calculated by Medusa's computeActions
          discountAmount = (product.price_asc * percentage) / 100;

        } else if (applicationMethod.type === "fixed") {
          discountAmount = applicationMethod.value || 0;

          // Ensure fixed discount doesn't exceed product price
          if (discountAmount > product.price_asc) {
            discountAmount = product.price_asc; // Cap at product price
          }
        }

        // Ensure discount is positive and valid
        if (discountAmount <= 0) {
          continue; // No actual discount
        }

        // Round discount to 2 decimal places
        discountAmount = roundToTwoDecimals(discountAmount);

        const upperLimit =
          promotion.promotion_extension?.promo_code_upper_limit;
        if (upperLimit && upperLimit > 0 && discountAmount > upperLimit) {
          discountAmount = upperLimit;
        }

        // Keep track of best discount (highest discount amount)
        if (discountAmount > maxDiscount) {
          maxDiscount = discountAmount;
          bestPromotion = promotion;
        }
      }

      // Add result for this product
      // Ensure proper rounding of prices
      const originalPrice = roundToTwoDecimals(product.price_asc);
      const discountAmount = roundToTwoDecimals(maxDiscount);
      const discountedPrice = roundToTwoDecimals(originalPrice - discountAmount);
      
      const upperLimitValue = bestPromotion?.promotion_extension?.promo_code_upper_limit;
      // Convert to number if it's a string, and handle 0 as a valid value (0 means no limit, so we use undefined)
      const upperLimitNumber = upperLimitValue != null && upperLimitValue !== '' 
        ? (typeof upperLimitValue === 'string' ? parseFloat(upperLimitValue) : upperLimitValue)
        : undefined;
      
      // Only include if it's a positive number (0 means no limit)
      const finalUpperLimit = upperLimitNumber && upperLimitNumber > 0 ? upperLimitNumber : undefined;
      
      results.push({
        product_id: product.id,
        variant_id: product.variant_id ?? null,
        best_promotion_code: bestPromotion?.code || null,
        original_price: originalPrice,
        discounted_price: discountedPrice >= 0 ? discountedPrice : 0,
        discount_amount: discountAmount,
        promo_code_upper_limit: finalUpperLimit,
      });
    }

    return results;
  } catch {
    // Return products with no promotions on error
    return products.map((product) => ({
      product_id: product.id,
      variant_id: product.variant_id ?? null,
      best_promotion_code: null,
      original_price: product.price_asc,
      discounted_price: product.price_asc,
      discount_amount: 0,
      promo_code_upper_limit: undefined,
    }));
  }
}

/**
 * Best-effort seller id for PLP/PDP promotion display (no `cart_id` available).
 *
 * Why: seller-based promotions must be matched against a seller context,
 * but PLP/PDP doesn't have a cart. In this project, PLP/PDP listings come from
 * the YesPlz provider, so we only extract seller from the YesPlz product payload.
 */
export function listingSellerIdFromProductPayload(product: any): string | undefined {
  if (product == null || typeof product !== "object") return undefined

  const direct =
    product.seller_id ??
    product.sellerId ??
    product.seller?.id ??
    product.seller?.sellerId

  if (direct != null && direct !== "") return String(direct)

  return undefined
}
