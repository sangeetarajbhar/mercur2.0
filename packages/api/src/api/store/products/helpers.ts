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
import { constructS3Url, extractRelativePath } from "../../../shared/utils/common"
import {IMAGE_RESOLUTION_MAPPING, IMAGE_RESOLUTION_TO_VARIANT} from "./image-constants";

/**
 * Minimal URL builder for YesPlz PLP images.
 * Replaces the resolution/variant folder segment (pathParts[3]) based on imageVersion.
 *   v2  → IMAGE_RESOLUTION_TO_VARIANT  (e.g. "3x" → "small")
 *   v1  → IMAGE_RESOLUTION_MAPPING     (e.g. "3x" → "256x341")
 */
const buildYesPlzImageUrl = (
  urlOrPath: string,
  resolution: string,
  imageVersion?: string
): string => {
  if (!urlOrPath) return constructS3Url(urlOrPath)

  const relativePath = extractRelativePath(urlOrPath)
  const parts = relativePath.split("/")

  if (parts.length < 4 || parts[0] !== "images" || parts[1] !== "product") {
    return constructS3Url(relativePath)
  }

  const segment = imageVersion === "v2"
    ? IMAGE_RESOLUTION_TO_VARIANT[resolution]
    : IMAGE_RESOLUTION_MAPPING[resolution]

  if (!segment) return constructS3Url(relativePath)

  parts[3] = segment
  return constructS3Url(parts.join("/"))
}

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

export const transformProductImageUrlsWithResolution = (
  products: any[],
  resolution: string | undefined,
  transformSingleProduct: (product: any, resolution?: string) => void
): void => {
  if (!Array.isArray(products) || products.length === 0) return

  for (const product of products) {
    transformProductImageUrlsWithResolutionForPLP(
      product,
      resolution,
      transformSingleProduct
    )
  }
}

/**
 * PLP helper: normalize different product image payload shapes (Algolia/YesPlz/etc)
 * and reuse the shared image URL transformer.
 *
 * This function is intentionally synchronous: it only mutates URLs/paths in-place.
 */
export const transformProductImageUrlsWithResolutionForPLP = (
  product: any,
  resolution: string | undefined,
  transformSingleProduct: (product: any, resolution?: string) => void
): void => {
  if (!product || typeof product !== "object") return

  const images = (product as any).images
  const thumbnail = (product as any).thumbnail

  // Case A: YesPlz-ish shape: images: [{ src: string, ... }]
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "object" && images[0] && "src" in images[0]) {
    for (const img of images as any[]) {
      if (!img || typeof img !== "object" || typeof img.src !== "string") continue

      const temp = { images: [{ url: img.src, metadata: (img as any).metadata }] }
      transformSingleProduct(temp, resolution)
      const nextUrl = temp.images?.[0]?.url
      if (typeof nextUrl === "string") img.src = nextUrl
    }

    if (typeof thumbnail === "string") {
      const temp = { thumbnail, images: (images as any[]).map((i) => ({ url: i?.src, metadata: i?.metadata })) }
      transformSingleProduct(temp, resolution)
      if (typeof temp.thumbnail === "string") (product as any).thumbnail = temp.thumbnail
    }

    return
  }

  // Case B: Medusa-ish shape: images: [{ url: string, metadata? }], thumbnail?: string
  if (Array.isArray(images) || typeof thumbnail === "string") {
    transformSingleProduct(product, resolution)
  }
}
