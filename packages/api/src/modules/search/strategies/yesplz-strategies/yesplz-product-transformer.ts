/**
 * YesPlz Product Transformer
 * Transforms Medusa/Algolia product format to YesPlz webhook format
 */

import {
  IProductTransformer,
  SearchProduct,
  ProductVariant,
  VariantOption,
  ProductImage
} from '../../types'
import { resolveYesPlzPrimaryColour } from '../../utils/product-colors'
import { calculateYesPlzDiscount } from './yesplz-service'

const SIZE_OPTION_TITLE = 'size'

const isSizeOption = (optionTitle: string): boolean => {
  return optionTitle.toLowerCase() === SIZE_OPTION_TITLE
}

/** Keys already represented as top-level YesPlz fields — omit from `filters`. */
const YESPLZ_FILTER_EXCLUDE_KEYS = new Set([
  'gender',
  'category',
  'brand',
  'brands',
  'color',
  'colour',
  'size',
  'sizes',
  'price',
  'discount',
])

function buildYesPlzFacetFilters(filters: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [key, values] of Object.entries(filters)) {
    if (!key || YESPLZ_FILTER_EXCLUDE_KEYS.has(key)) continue
    if (!Array.isArray(values) || values.length === 0) continue

    const seen = new Set<string>()
    const deduped: string[] = []
    for (const v of values) {
      const s = String(v).trim()
      if (!s || seen.has(s)) continue
      seen.add(s)
      deduped.push(s)
    }
    if (deduped.length > 0) {
      out[key] = deduped
    }
  }
  return out
}

/**
 * YesPlz product output format
 */
export interface YesPlzProduct {
  productId: string
  /** Display name for YesPlz: Medusa `title` only (same field name `productName` on the API). */
  productName: string
  /** Medusa product subtitle (kept as-is for downstream sync/debug). */
  subtitle: string
  description: string
  images: Array<{ view: string; src: string }>
  inventoryInfo: Array<{
    skuId: string
    label: string
    available: boolean
    brandSizeLabel: string
    location: string[]
  }>
  sizes: string
  mrp: number
  price: number
  discountLabel: string
  discountDisplayLabel: string
  primaryColour: string | null
  category: string
  // couponData: {
  //   couponDiscount?: number
  //   couponCode?: string
  //   couponDescription: {
  //     description: string
  //     couponCode?: string
  //     bestPrice?: number
  //     bestPriceText?: string
  //   }
  // }
  couponData: object
  articleType: {
    typeName: string
  }
  masterCategory: {
    typeName: string
  }
  isInStock: boolean
  handle: string
  isActive: boolean
  brand: string
  gender: string | null
  final_score?: number
  is_try_and_buy: boolean
  seller: {
    sellerId: string
  }
  /**
   * Facet filters (key → string[]), same facet keys as SearchProduct `filters` minus
   * fields already sent as first-class properties (gender, category, brand, color, size, etc.).
   */
  filters: Record<string, string[]>
  /** YesPlz expects this field; we always send an explicit empty list until style tags are wired. */
  styleTags: string[]
}

/**
 * YesPlz Product Transformer Class
 * Implements IProductTransformer interface for transforming products to YesPlz format
 */
export class YesPlzProductTransformer implements IProductTransformer<SearchProduct, YesPlzProduct> {
  /**
   * Transform a single product to YesPlz format
   * Takes a product that's already been processed (similar to Algolia format)
   * and transforms it to YesPlz webhook payload format
   */
  transform(product: SearchProduct): YesPlzProduct | null {
    // Early validation - need id, variants, non-empty title (YesPlz productName), and pricing
    if (!product?.id || !Array.isArray(product.variants) || product.variants.length === 0) {
      return null
    }

    const productName = typeof product.title === 'string' ? product.title.trim() : ''
    if (!productName) {
      return null
    }

    // Check pricing in single pass
    const hasPricing = product.variants.some((v: ProductVariant) => {
      const amount = v.calculated_price?.calculated_amount
      return amount !== null && amount !== undefined
    })
    
    if (!hasPricing) {
      return null
    }

    // Cache frequently accessed values
    const productId = product.id
    const variants = product.variants
    const filters = product.filters || {}
    // const couponData = product.couponData

    // Get primary category name (cached fallback chain)
    const primaryCategory = product.categories?.[0]?.name || 
                           filters.category?.[0] || 
                           product.category || 
                           ''

    // Get master category
    const masterCategoryName = product.type || 
                              product.collection || 
                              product.masterCategory || 
                              ''

    // Get brand — never send null; YesPlz DB has brand_name NOT NULL constraint
    const brand: string = product.brand || ''

    // Get gender from filters (populated by extractFilters from attribute_values)
    const gender: string | null = filters.gender?.[0] || null

    // Colors for YesPlz: product-level `options` only (see `fetchProducts` → `product.options`).
    // Not merged into `filters.color`; primaryColour is the only YesPlz color field we set from options.
    const primaryColour = resolveYesPlzPrimaryColour(product)

    // Get sizes - optimize array operations
    let sizes = filters.size?.join(', ') || ''
    if (!sizes) {
      const sizeValues = variants
        .map((v: ProductVariant) => 
          v.options?.find((opt: VariantOption) => isSizeOption(opt.option?.title || ''))?.value
        )
        .filter((value): value is string => Boolean(value))
      sizes = sizeValues.join(', ')
    }

    // Use price/mrp from fetchProducts (same logic as price sync); fallback to 0 if missing
    const mrp = product.mrp != null && Number.isFinite(product.mrp) ? product.mrp : 0
    const price = product.price != null && Number.isFinite(product.price) ? product.price : 0

    // Get coupon best price (cache coupon description access)
    // sangeeta : commented out for finalprice calculation as we are not using coupon data in price discount calculation
    // const couponDescription = couponData?.couponDescription
    // const bestPrice = couponDescription?.bestPrice || price
    // const finalPrice = bestPrice

    // Calculate discount using shared logic (matches price sync)
    const dbDiscountPercentage =
      (product as unknown as { discount_percentage?: number | null }).discount_percentage
    const discountInfo = calculateYesPlzDiscount(dbDiscountPercentage, mrp, price)

    // Transform images - optimize mapping
    const images = (product.images || []).map((img: ProductImage) => ({
      view: 'default',
      src: img.url || String(img)
    }))

    // Transform variants - optimize with cached values
    const inventoryInfo = variants.map((variant: ProductVariant) => {
      // Find size option once
      const sizeOption = variant.options?.find((opt: VariantOption) => 
        isSizeOption(opt.option?.title || '')
      )
      
      const sizeValue = sizeOption?.value
      const label = sizeValue || variant.title || ''

      // Check availability - optimize boolean logic
      const hasInventory = (variant.inventory_quantity ?? 0) > 0
      const noInventoryManagement = variant.manage_inventory === false
      const hasVariantLocations = (variant.available_locations?.length || 0) > 0
      const available = hasInventory || noInventoryManagement || hasVariantLocations

      // Get locations - only use variant-specific locations, don't fallback to product-level
      // If variant doesn't have locations mapped, use empty array
      const location = (variant.available_locations && variant.available_locations.length > 0) 
        ? variant.available_locations 
        : []

      // Ensure skuId is always a string
      const skuId = variant.id || variant.sku || ''

      return {
        skuId,
        label,
        available,
        brandSizeLabel: sizeValue || label,
        location
      }
    })

    // Check stock status - use some() result directly
    const isInStock = inventoryInfo.some(inv => inv.available)

    // Build coupon data - optimize with cached values
    // const bestPriceText = couponDescription?.bestPriceText || ''
    // const formattedPrice = formatPrice(bestPrice)
    
    // Create coupon description with interpolation
    // const defaultCouponDescription = {
    //   description: '{bestPriceText} {bestPrice} with coupon',
    //   couponCode: '',
    //   bestPrice,
    //   bestPriceText
    // }
    
    // const finalCouponDescription = couponDescription || defaultCouponDescription
    
    // Interpolate description template
    // const interpolatedDescription = finalCouponDescription.description
    //   .replace('{bestPriceText}', bestPriceText)
    //   .replace('{bestPrice}', formattedPrice)
    
    // Build coupon data object
    // const finalCouponData = couponData ? {
    //   ...couponData,
    //   couponDescription: {
    //     ...finalCouponDescription,
    //     description: interpolatedDescription,
    //     bestPrice,
    //     bestPriceText
    //   }
    // } : {
    //   couponDiscount: 0,
    //   couponDescription: {
    //     ...finalCouponDescription,
    //     description: interpolatedDescription
    //   }
    // }

    const yesPlzFilters = buildYesPlzFacetFilters(filters)

    // Build YesPlz product payload
    return {
      productId,
      productName,
      subtitle: typeof product.subtitle === 'string' ? product.subtitle : '',
      description: product.description || product.subtitle || '',
      images,
      inventoryInfo,
      sizes,
      mrp,
      price,
      discountLabel: discountInfo.discountLabel,
      discountDisplayLabel: discountInfo.discountDisplayLabel,
      primaryColour,
      category: primaryCategory,
      couponData: {},
      articleType: {
        typeName: primaryCategory || ''
      },
      masterCategory: {
        typeName: masterCategoryName
      },
      isInStock,
      handle: product.handle ?? '',
      isActive: product.status === 'published',
      brand,
      gender,
      final_score: (product as SearchProduct & { final_score?: number }).final_score ?? 0,
      is_try_and_buy: product.is_try_and_buy ?? true,
      seller: {
        sellerId: product.seller?.sellerId || ''
      },
      filters: yesPlzFilters,
      styleTags: []
    }
  }

  /**
   * Transform multiple products in batch
   * Filters out null values (failed transformations)
   */
  transformBatch(products: SearchProduct[]): YesPlzProduct[] {
    return products
      .map(product => this.transform(product))
      .filter((product): product is YesPlzProduct => product !== null)
  }
}

/**
 * Default transformer instance (singleton pattern)
 */
export const yesPlzProductTransformer = new YesPlzProductTransformer()

/**
 * Transform product to YesPlz format (backward compatibility function)
 * @deprecated Use YesPlzProductTransformer class or yesPlzProductTransformer instance instead
 * Takes a product that's already been processed (similar to Algolia format)
 * and transforms it to YesPlz webhook payload format
 */
export function transformProductToYesPlz(product: SearchProduct): YesPlzProduct | null {
  return yesPlzProductTransformer.transform(product)
}

