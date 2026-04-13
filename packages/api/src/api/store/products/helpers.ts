import { AuthenticatedMedusaRequest, MedusaStoreRequest, /*refetchEntity */ } from "@medusajs/framework/http"
import {
  HttpTypes,
  ItemTaxLineDTO,
  MedusaContainer,
  TaxableItemDTO,
  TaxCalculationContext,
} from "@medusajs/framework/types"
import { calculateAmountsWithTax, Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import customerWishlist from "../../../links/customer-wishlist"
import { refetchEntity } from "../../utils/refetch-entity"

export type RequestWithContext<
  Body,
  QueryFields = Record<string, unknown>
> = MedusaStoreRequest<Body, QueryFields> & {
  taxContext: {
    taxLineContext?: TaxCalculationContext
    taxInclusivityContext?: {
      automaticTaxes: boolean
    }
  }
}

export const refetchProduct = async (
  idOrFilter: string | object,
  scope: MedusaContainer,
  fields: string[]
) => {
  return await refetchEntity("product", idOrFilter, scope, fields)
}

export const wrapProductsWithTaxPrices = async <T>(
  req: RequestWithContext<T>,
  products: HttpTypes.StoreProduct[]
) => {
  // If we are missing the necessary context, we can't calculate the tax, so only `calculated_amount` will be available
  if (
    !req.taxContext?.taxInclusivityContext ||
    !req.taxContext?.taxLineContext
  ) {
    return
  }

  // If automatic taxes are not enabled, we should skip calculating any tax
  if (!req.taxContext.taxInclusivityContext.automaticTaxes) {
    return
  }

  const taxService = req.scope.resolve(Modules.TAX)

  const taxRates = (await taxService.getTaxLines(
    products.map(asTaxItem).flat(),
    req.taxContext.taxLineContext
  )) as unknown as ItemTaxLineDTO[]

  const taxRatesMap = new Map<string, ItemTaxLineDTO[]>()
  taxRates.forEach((taxRate) => {
    if (!taxRatesMap.has(taxRate.line_item_id)) {
      taxRatesMap.set(taxRate.line_item_id, [])
    }

    taxRatesMap.get(taxRate.line_item_id)?.push(taxRate)
  })

  products.forEach((product) => {
    product.variants?.forEach((variant) => {
      if (!variant.calculated_price) {
        return
      }

      const taxRatesForVariant = taxRatesMap.get(variant.id) || []
      const { priceWithTax, priceWithoutTax } = calculateAmountsWithTax({
        taxLines: taxRatesForVariant,
        amount: variant.calculated_price!.calculated_amount!,
        includesTax:
          variant.calculated_price!.is_calculated_price_tax_inclusive!,
      })

      variant.calculated_price.calculated_amount_with_tax = priceWithTax
      variant.calculated_price.calculated_amount_without_tax = priceWithoutTax

      const {
        priceWithTax: originalPriceWithTax,
        priceWithoutTax: originalPriceWithoutTax,
      } = calculateAmountsWithTax({
        taxLines: taxRatesForVariant,
        amount: variant.calculated_price!.original_amount!,
        includesTax: variant.calculated_price!.is_original_price_tax_inclusive!,
      })

      variant.calculated_price.original_amount_with_tax = originalPriceWithTax
      variant.calculated_price.original_amount_without_tax =
        originalPriceWithoutTax
    })
  })
}

const asTaxItem = (product: HttpTypes.StoreProduct): TaxableItemDTO[] => {
  return product.variants
    ?.map((variant) => {
      if (!variant.calculated_price) {
        return
      }

      return {
        id: variant.id,
        product_id: product.id,
        product_type_id: product.type_id,
        quantity: 1,
        unit_price: variant.calculated_price.calculated_amount,
        currency_code: variant.calculated_price.currency_code,
      }
    })
    .filter((v) => !!v) as unknown as TaxableItemDTO[]
}

export const addWishlistFlagToProducts = async (req: AuthenticatedMedusaRequest, products: HttpTypes.StoreProduct[]) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: wishlists } = await query.graph({
    entity: customerWishlist.entryPoint,
    fields: ["wishlist.products.id"],
    filters: {
      customer_id: req.auth_context.actor_id,
    }
  })

  const wishlistProductIds = new Set(
    wishlists.flatMap((w: any) =>
      (w.wishlist.products || [])
        .map((p: any) => p?.id)
        .filter(Boolean)
    )
  );

  for (const product of products) {
    //need to do as any because medusas product type does not have in_wishlist field
    (product as any).in_wishlist = wishlistProductIds.has(product.id);
  }
}

/**
 * Legacy dimension-based resolution mapping for old seller import products
 * These products store paths without size folders and use dimension-based S3 folders
 * Based on dev branch history and actual S3 structure verification
 */
export const IMAGE_RESOLUTION_MAPPING: Record<string, string> = {
  "1x": "80x107",
  "2x": "160x213",    // From dev branch - verify S3 folder exists
  "3x": "256x341",    // From dev branch - verify S3 folder exists
  "4x": "512x683",    // From dev branch - verify S3 folder exists
  "5x": "800x1067",   // From dev branch - you mentioned this exists in S3
  "6x": "960x1280",   // From dev branch - you mentioned this exists in S3
}

/**
 * PLP-specific dimension-based resolution mapping
 * For PLP, we want to serve 5x resolution (800x1067) for all dimension-based images
 * to provide higher quality images in product listing pages
 */
export const PLP_IMAGE_RESOLUTION_MAPPING: Record<string, string> = {
  "1x": "800x1067",  // Force 5x quality for PLP
  "2x": "800x1067",  // Force 5x quality for PLP
  "3x": "800x1067",  // Force 5x quality for PLP
  "4x": "800x1067",  // Force 5x quality for PLP
  "5x": "800x1067",  // Keep 5x as 5x
  "6x": "960x1280",  // Keep 6x as 6x (higher than 5x)
}

/**
 * Resolves image resolution specifically for PLP context
 * Returns 5x resolution (800x1067) for dimension-based images in PLP
 */
export const resolvePLPImageResolution = (resolution?: string): string | undefined => {
  if (!resolution) return undefined;
  return PLP_IMAGE_RESOLUTION_MAPPING[resolution];
}

/**
 * Variant-based resolution mapping for new Lambda import products
 * These products store variant metadata and use variant names as keys
 * This allows dimensions to be dynamic (configured in DynamoDB)
 */
export const IMAGE_RESOLUTION_TO_VARIANT: Record<string, string> = {
  "1x": "thumb",
  "2x": "thumb",
  "3x": "small",
  "4x": "medium",
  "5x": "large",
  "6x": "xlarge"
}

/**
 * Special variant mapping for PLP (Product List Page) context
 * For PLP, we want to serve smaller variants for better performance
 * while still supporting 1x-6x resolution requests
 */
export const IMAGE_RESOLUTION_TO_VARIANT_PLP: Record<string, string> = {
  "1x": "thumb",
  "2x": "small",
  "3x": "small",
  "4x": "large",
  "5x": "small",    // PLP: serve small variant for 5x requests for better performance
  "6x": "small"     // PLP: serve small variant for 6x requests for better performance
}

/**
 * Resolves the image resolution string from a given resolution key.
 * For legacy products (dimension-based), returns dimension folder name.
 * If the requested resolution doesn't exist, falls back to the nearest lower resolution.
 * For new products (variant-based), use IMAGE_RESOLUTION_TO_VARIANT instead.
 */
export const resolveImageResolution = (resolution?: string): string | undefined => {
  if (!resolution) return undefined;

  // Direct match only - let client handle 404s and choose fallback
  return IMAGE_RESOLUTION_MAPPING[resolution];
}

/**
 * Finds the nearest lower resolution for unsupported resolution requests.
 * This provides a better user experience than returning undefined.
 *
 * @param requestedResolution - The resolution that was requested (e.g., "5x", "6x")
 * @param availableResolutions - The mapping of available resolutions
 * @returns The nearest lower resolution or undefined if no fallback is possible
 */
export const findNearestLowerResolution = (
  requestedResolution: string,
  availableResolutions: Record<string, string>
): string | undefined => {
  // Extract numeric part from resolution (e.g., "5x" -> 5)
  const requestedNum = parseFloat(requestedResolution.replace('x', ''));

  // If it's not a numeric resolution pattern, return undefined
  if (isNaN(requestedNum)) {
    return undefined;
  }

  // Get all available resolution numbers and sort them
  const availableNums = Object.keys(availableResolutions)
    .map(key => parseFloat(key.replace('x', '')))
    .filter(num => !isNaN(num) && num <= requestedNum)
    .sort((a, b) => b - a); // Sort descending to get highest lower resolution first

  // Return the highest available resolution that's lower than requested
  if (availableNums.length > 0) {
    const fallbackNum = availableNums[0];
    const fallbackKey = `${fallbackNum}x`;
    return availableResolutions[fallbackKey];
  }

  return undefined;
}

/**
 * Finds the nearest lower resolution key for any resolution mapping.
 * This is used for both dimension and variant mappings.
 *
 * @param requestedResolution - The resolution that was requested (e.g., "5x", "6x")
 * @param availableResolutions - The mapping of available resolutions (key -> value)
 * @returns The nearest lower resolution key or undefined if no fallback is possible
 */
export const findNearestLowerResolutionKey = (
  requestedResolution: string,
  availableResolutions: Record<string, string>
): string | undefined => {
  // Extract numeric part from resolution (e.g., "5x" -> 5)
  const requestedNum = parseFloat(requestedResolution.replace('x', ''));

  // If it's not a numeric resolution pattern, return undefined
  if (isNaN(requestedNum)) {
    return undefined;
  }

  // Get all available resolution keys, extract numbers, and find the best fallback
  const availableKeys = Object.keys(availableResolutions)
    .map(key => ({
      key,
      num: parseFloat(key.replace('x', ''))
    }))
    .filter(item => !isNaN(item.num) && item.num <= requestedNum)
    .sort((a, b) => b.num - a.num); // Sort descending to get highest lower resolution first

  // Return the key of the highest available resolution that's lower than requested
  return availableKeys.length > 0 ? availableKeys[0].key : undefined;
}

/**
 * Resolves the variant name from a given resolution key.
 * For new Lambda import products that use variant metadata.
 * If the requested resolution doesn't exist, falls back to the nearest lower resolution.
 *
 * @param resolution - The resolution key (e.g., "2x", "5x")
 * @param context - Optional context ("plp" for Product List Page, undefined for default/PDP)
 */
export const resolveVariantName = (resolution?: string, context?: string): string | undefined => {
  if (!resolution) return undefined;

  // Choose mapping based on context
  const mapping = context === 'plp' ? IMAGE_RESOLUTION_TO_VARIANT_PLP : IMAGE_RESOLUTION_TO_VARIANT;

  // Direct match
  if (mapping[resolution]) {
    return mapping[resolution];
  }

  // Fallback to nearest lower resolution for better UX
  const fallbackKey = findNearestLowerResolutionKey(resolution, mapping);
  return fallbackKey ? mapping[fallbackKey] : undefined;
}

/**
 * Transforms product(s) image URLs using the resolved resolution, if provided.
 * Accepts a single product or an array of products.
 */
export const transformProductImageUrlsWithResolution = (
  products: any | any[],
  resolution?: string,
  transformFn?: (product: any, resolvedResolution?: string) => void
) => {
  const resolved = resolveImageResolution(resolution);
  if (Array.isArray(products)) {
    products.forEach((product) => {
      if (transformFn) {
        transformFn(product, resolved);
      }
    });
  } else if (products) {
    if (transformFn) {
      transformFn(products, resolved);
    }
  }
}

/**
 * PLP-specific transform function that passes the original resolution key
 * and "plp" context through to constructS3UrlWithResolution.
 * This ensures v2 images use IMAGE_RESOLUTION_TO_VARIANT_PLP mapping
 * and v1 images use PLP_IMAGE_RESOLUTION_MAPPING.
 */
export const transformProductImageUrlsWithResolutionForPLP = (
  products: any | any[],
  resolution?: string,
  transformFn?: (product: any, resolvedResolution?: string, context?: string) => void
) => {
  // Pass original resolution key (e.g., "3x") — NOT pre-resolved dimension.
  // constructS3UrlWithResolution will resolve it based on context and image type.
  if (Array.isArray(products)) {
    products.forEach((product) => {
      if (transformFn) {
        transformFn(product, resolution, 'plp');
      }
    });
  } else if (products) {
    if (transformFn) {
      transformFn(products, resolution, 'plp');
    }
  }
}
