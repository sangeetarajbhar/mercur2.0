/**
 * Simplified image URL resolver for v2 and legacy images.
 *
 * v2 images follow the path convention:
 *   images/product/{product_id}/{variant}/{filename}
 * where {variant} is one of: thumb, small, medium, large, xlarge.
 *
 * To resolve a different size we simply swap the variant segment in the path.
 *
 * Legacy images use dimension-based path segments (e.g. "256x341").
 */

import { constructS3Url, extractRelativePath } from '../../../../shared/utils/common'
import {
  IMAGE_RESOLUTION_TO_VARIANT,
  IMAGE_RESOLUTION_MAPPING,
} from './image-constants'

const VARIANT_NAMES = new Set(['thumb', 'small', 'medium', 'large', 'xlarge'])

// ---------------------------------------------------------------------------
// Core resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a single image URL to the correct CDN URL for a given resolution.
 *
 * v2     → swap the variant segment in the path (e.g. /xlarge/ → /small/)
 * legacy → swap the dimension segment (e.g. /256x341/ → /80x107/)
 * no resolution → return plain CDN URL
 *
 * Works regardless of whether image.url stores thumb or xlarge.
 */
export function resolveImageUrl(url: string, resolution?: string): string {
  if (!url) return ''

  const relative = extractRelativePath(url)

  // No resolution requested – just build the CDN URL
  if (!resolution) return constructS3Url(relative)

  const parts = relative.split('/')
  const isProductPath = parts.length >= 4 && parts[0] === 'images' && parts[1] === 'product'

  // ── v2: swap variant name in path ───────────────────────────────────────
  if (isProductPath && VARIANT_NAMES.has(parts[3])) {
    const targetVariant = IMAGE_RESOLUTION_TO_VARIANT[resolution]
    if (targetVariant) {
      parts[3] = targetVariant
      return constructS3Url(parts.join('/'))
    }
    return constructS3Url(relative)
  }

  // ── Legacy: swap dimension segment (Forced to 4x) ───────────────────────
  const forceLegacyResolution = "5x"
  const dimension = IMAGE_RESOLUTION_MAPPING[forceLegacyResolution]

  if (!dimension) return constructS3Url(relative)

  if (isProductPath) {
    if (/^\d+x\d+$/.test(parts[3])) {
      parts[3] = dimension
    } else {
      parts.splice(3, 0, dimension)
    }
    return constructS3Url(parts.join('/'))
  }

  return constructS3Url(relative)
}

// ---------------------------------------------------------------------------
// PLP product transform
// ---------------------------------------------------------------------------

/**
 * Transform all image URLs on a single product for PLP display.
 *
 * Handles two payload shapes:
 *   • YesPlz  – `images: [{ src }]`
 *   • Medusa  – `images: [{ url }]`
 *
 * v2 vs legacy is detected from the URL path itself (no metadata needed).
 * Works regardless of whether image.url stores thumb or xlarge.
 */
export function transformProductImagesForPLP(
  product: any,
  resolution?: string
): void {
  if (!product || typeof product !== 'object') return

  const images: any[] | undefined = product.images

  // ── YesPlz shape: { src } ────────────────────────────────────────────────
  if (Array.isArray(images) && images.length > 0 && images[0]?.src !== undefined) {
    for (const img of images) {
      if (!img?.src) continue
      img.src = resolveImageUrl(img.src, resolution)
    }
    if (product.thumbnail && typeof product.thumbnail === 'string') {
      product.thumbnail = resolveImageUrl(product.thumbnail, resolution)
    }
    return
  }

  // ── Medusa shape: { url } ────────────────────────────────────────────────
  if (Array.isArray(images)) {
    for (const img of images) {
      if (!img?.url) continue
      img.url = resolveImageUrl(img.url, resolution)
    }
  }

  if (product.thumbnail && typeof product.thumbnail === 'string') {
    product.thumbnail = resolveImageUrl(product.thumbnail, resolution)
  }
}
