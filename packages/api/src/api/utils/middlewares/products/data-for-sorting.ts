import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaStoreRequest } from "@medusajs/framework/http"
import PricingModule from "@medusajs/medusa/pricing"
import priceExtendLink from "../../../../links/price-extend-price"

/**
 * Fetch discount percentages for given price IDs using the link to ExtendPrice
 */
async function getPriceDiscounts(container: any, priceIdsArray: string[]) {
  if (!priceIdsArray.length) return {}

 const query = container.resolve(ContainerRegistrationKeys.QUERY)
 
  const pricesWithDiscount = await query.graph({
    entity: priceExtendLink.entryPoint, 
    fields: ["extend_price.percentage_discount", "price.*"],
    filters: { price_id : { $in: priceIdsArray } }
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

interface ProductVariantPrice {
  calculated_amount?: number
  price_id?: string
}

interface ProductVariant {
  id?: string
  calculated_price?: ProductVariantPrice & {
    seller_prices?: Record<string, ProductVariantPrice>
    min_price_seller_id?: string
  }
  color?: string
  options?: Array<{ value?: string }>
  material?: string
  type?: string
  occasion?: string
  metadata?: { color?: string; [key: string]: any }
}

interface Product {
  variants?: ProductVariant[]
  created_at?: string
  sortBy?: {
    price_asc: number | null
    price_max: number | null
    discount: number | null
    is_new_arrival: boolean
    popularity_score: number | null
  }
  global_min_price?: number
  global_max_price?: number
  [key: string]: any
}

export const dataNormalization = async (
  req: MedusaStoreRequest<unknown>,
  products: Product[]
) => {
  try {
    const NEW_ARRIVAL_DAYS = 30;

    const priceIdsArray: string[] = [];
    for (const product of products) {
      for (const variant of product.variants || []) {
        const cp = variant.calculated_price as any;
        // Collect price ID from main calculated_price
        if (cp?.calculated_price?.id) {
          priceIdsArray.push(cp.calculated_price.id);
        }
        // Also collect price IDs from seller prices for discount lookup
        if (cp?.seller_prices) {
          Object.values(cp.seller_prices).forEach((sellerPrice: any) => {
            if (sellerPrice?.calculated_price?.id) {
              priceIdsArray.push(sellerPrice.calculated_price.id);
            }
          });
        }
      }
    }
    const uniquePriceIds = [...new Set(priceIdsArray)];
    const discountMap = await getPriceDiscounts(req.scope, uniquePriceIds);

    // Calculate global min and max prices across all products
    let globalMinPrice = Infinity;
    let globalMaxPrice = 0;
    const allPrices: number[] = [];

    for (const product of products) {
      for (const variant of product.variants || []) {
        const cp = variant.calculated_price as any;
        if (cp && typeof cp.calculated_amount === "number" && cp.calculated_amount > 0) {
          allPrices.push(cp.calculated_amount);
          if (cp.calculated_amount < globalMinPrice) {
            globalMinPrice = cp.calculated_amount;
          }
          if (cp.calculated_amount > globalMaxPrice) {
            globalMaxPrice = cp.calculated_amount;
          }
        }
      }
    }

    // Set default values if no prices found
    if (globalMinPrice === Infinity) globalMinPrice = 0;
    if (globalMaxPrice === 0 && allPrices.length === 0) globalMaxPrice = 0;

    for (const product of products) {
      let min_price = Infinity;
      let min_variant_id: string | null = null;
      let discount = 0;
      const variantPrices: number[] = [];
      const discountPercentages: number[] = [];

      // Prepare arrays for filters
      const colors: string[] = [];
      const sizes: string[] = [];
      const brands: string[] = [];
      const categories: string[] = [];
      const materials: string[] = [];
      const types: string[] = [];
      const occasions: string[] = [];


      // find min price variant id
      const minPriceVariantId = product.min_price_variant_id;

      if (minPriceVariantId) {
        const minPriceVariant = product.variants?.find(
          (variant: any) => variant.id === minPriceVariantId
        );
      
        if (minPriceVariant) {
          const minPriceSellerId =
            minPriceVariant.calculated_price?.min_price_seller_id || '';
      
          const minPriceSeller =
            minPriceVariant.calculated_price?.seller_prices?.[minPriceSellerId as string];
      
          const minPrice = minPriceSeller?.calculated_amount || 0;
          const priceId = (minPriceSeller as any)?.calculated_price?.id;
          const discountPercentage = priceId && discountMap[priceId] != null 
            ? (discountMap[priceId] as number) 
            : 0;
      
          if (minPrice) {
            min_price =  minPrice;
            discount = discountPercentage;
          }
        }
      }

      

      // === PRICES & VARIANT-LEVEL FIELDS ===
      // for (const variant of product.variants || []) {
      //   const cp = variant.calculated_price as any;
      //   if (!cp) continue;

      //   if (typeof cp.calculated_amount === "number") {
      //     variantPrices.push(cp.calculated_amount);
      //     if (cp.calculated_amount < min_price) {
      //       min_price = cp.calculated_amount;
      //       if (typeof variant.id === "string") {
      //         min_variant_id = variant.id;
      //       }
      //     }
      //     if (cp.calculated_price?.id && discountMap[cp.calculated_price.id] != null) {
      //       discountPercentages.push(discountMap[cp.calculated_price.id] as number);
      //     }
      //   }

      //   // Variant-level extra filters
      //   if (variant.material) materials.push(variant.material);
      //   if (variant.type) types.push(variant.type);
      //   if (variant.occasion) occasions.push(variant.occasion);
      // }

      for (const variant of product.variants || []) {
        const cp = variant.calculated_price as any;
        if (!cp) continue;
      
        let variantMinPrice = null;
      
        // Case 1: We have min_price_seller_id → use seller price
        if (cp.min_price_seller_id) {
          const sellerId = cp.min_price_seller_id;
          const seller = cp.seller_prices?.[sellerId];
      
          if (seller?.calculated_amount != null) {
            variantMinPrice = seller.calculated_amount;
          }
        }
      
        // Case 2: fallback → use top-level calculated_amount
        if (variantMinPrice == null && typeof cp.calculated_amount === "number") {
          variantMinPrice = cp.calculated_amount;
        }
      
        // Track variant prices
        if (variantMinPrice != null) {
          variantPrices.push(variantMinPrice);
      
          if (variantMinPrice < min_price) {
            min_price = variantMinPrice;
      
            if (typeof variant.id === "string") {
              min_variant_id = variant.id;
            }
          }
        }
      
        // If variant-specific discount exists from discountMap (main calculated_price)
        if (cp.calculated_price?.id && discountMap[cp.calculated_price.id] != null) {
          discountPercentages.push(discountMap[cp.calculated_price.id] as number);
        }
        
        // Also check discounts from seller prices
        if (cp.seller_prices) {
          Object.values(cp.seller_prices).forEach((sellerPrice: any) => {
            if (sellerPrice?.calculated_price?.id && discountMap[sellerPrice.calculated_price.id] != null) {
              discountPercentages.push(discountMap[sellerPrice.calculated_price.id] as number);
            }
          });
        }
      
        // Variant metadata (unchanged)
        if (variant.material) materials.push(variant.material);
        if (variant.type) types.push(variant.type);
        if (variant.occasion) occasions.push(variant.occasion);
      }

      // === OPTIONS (Color, Size) ===
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

      // === PRODUCT-LEVEL FIELDS ===
      if (product.brand) {
        const brandName = typeof product.brand === 'string' ? product.brand : product.brand?.name;
        if (brandName) brands.push(brandName);
      }
      if (product.category) {
        const categoryName = typeof product.category === 'string' ? product.category : product.category?.name;
        if (categoryName) categories.push(categoryName);
      }

      // === FINAL PRICE CALCS ===

      
      if (min_price === Infinity) min_price = 0;
      const max_price = variantPrices.length ? Math.max(...variantPrices) : 0;
      const discount_percentage = discount || (discountPercentages.length ? Math.max(...discountPercentages) : 0);
      const createdAt = new Date(product.created_at || Date.now());
      const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const is_new_arrival = daysSinceCreated <= NEW_ARRIVAL_DAYS ? 1 : 0;

      // === FINAL ENRICHMENT ===
      product.price_asc = min_price;
      product.price_max = max_price;
      product.discount = discount_percentage;
      product.is_new_arrival = is_new_arrival;
      product.popularity_score = 0;
      product.min_price_variant_id = min_variant_id;

      // Add global price range for filtering
      product.global_min_price = globalMinPrice;
      product.global_max_price = globalMaxPrice;

      // === FILTERS OBJECT ===
      product.filters = {
        color: colors.length ? Array.from(new Set(colors)).join(",") : "",
        size: sizes.length ? Array.from(new Set(sizes)).join(",") : "",
        brand: brands.length ? Array.from(new Set(brands)).join(",") : "",
        category: categories.length ? Array.from(new Set(categories)).join(",") : "",
        material: materials.length ? Array.from(new Set(materials)).join(",") : "",
        type: types.length ? Array.from(new Set(types)).join(",") : "",
        occasion: occasions.length ? Array.from(new Set(occasions)).join(",") : ""
      };
    }

    return products;
  } catch (error: any) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to normalize product data: ${error.message}`
    );
  }
};
