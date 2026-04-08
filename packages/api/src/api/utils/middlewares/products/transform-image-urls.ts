import { HttpTypes } from "@medusajs/framework/types"
import { MedusaRequest } from "@medusajs/framework/http"
import { constructS3Url, extractRelativePath } from "../../../../shared/utils/common"
import { resolveImageResolution, resolvePLPImageResolution, resolveVariantName, IMAGE_RESOLUTION_MAPPING, findNearestLowerResolutionKey } from "../../../store/products/helpers"

// Simple logger for utility functions - uses console in debug mode
const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_IMAGE_TRANSFORM || process.env.DEBUG_PLP_IMAGES) {
      console.log('[IMAGE_TRANSFORM_DEBUG]', ...args)
    }
  }
}

/**
 * Check if a path segment is a dimension-based resolution (like 80x107, 256x341)
 */
const isDimensionResolution = (segment: string): boolean => {
  return /^\d+x\d+$/.test(segment)
}

/**
 * Check if a path segment is a Lambda variant name
 */
const isVariantName = (segment: string): boolean => {
  return ['thumb', 'small', 'medium', 'large', 'xlarge'].includes(segment)
}

/**
 * Helper function to modify image URL to include resolution in the path.
 *
 * Supports two patterns:
 * 1. New Lambda products (v2) with variant names - replaces variant name with target variant
 * 2. Old seller products (v1) with dimension folders - replaces/inserts dimension
 *
 * @param urlOrPath - The image URL or path
 * @param resolution - The resolution key (e.g., "2x", "3x")
 * @param imageMetadata - Optional image metadata (checks for image_version)
 */
export const constructS3UrlWithResolution = (
  urlOrPath: string,
  resolution?: string,
  imageMetadata?: Record<string, any>,
  context?: string
): string => {
  logger.debug('[constructS3UrlWithResolution] Input:', {
    urlOrPath,
    resolution,
    hasMetadata: !!imageMetadata,
    imageVersion: imageMetadata?.image_version,
    context
  })

  if (!resolution || !urlOrPath) {
    logger.debug('[constructS3UrlWithResolution] Early return - no resolution or URL')
    return constructS3Url(urlOrPath)
  }

  // Extract relative path if it's a full URL, otherwise use as-is
  const relativePath = extractRelativePath(urlOrPath)
  const pathParts = relativePath.split('/')
  logger.debug('[constructS3UrlWithResolution] Path analysis:', {
    relativePath,
    pathParts,
    segment3: pathParts[3]
  })

  // NEW APPROACH: For v2 images with variant_urls, use the specific URL
  if (imageMetadata?.image_version === 'v2') {
    const targetVariant = resolveVariantName(resolution, context)
    logger.debug('[constructS3UrlWithResolution] V2 processing:', {
      targetVariant,
      hasVariantUrls: !!imageMetadata.variant_urls,
      variantKeys: imageMetadata.variant_urls ? Object.keys(imageMetadata.variant_urls) : []
    })

    // If we have variant_urls and the target variant exists, use it directly
    if (imageMetadata.variant_urls && targetVariant && imageMetadata.variant_urls[targetVariant]) {
      const variantUrl = imageMetadata.variant_urls[targetVariant]
      logger.debug('[constructS3UrlWithResolution] Using variant_urls:', {
        resolution,
        targetVariant,
        variantUrl,
        result: constructS3Url(variantUrl)
      })
      return constructS3Url(variantUrl)
    }

    // Fallback: replace variant name in path (for v2 images without variant_urls)
    if (pathParts.length >= 4 && pathParts[0] === 'images' && pathParts[1] === 'product') {
      const segment3 = pathParts[3]

      // If path has a variant name, replace it with target variant
      if (isVariantName(segment3) && targetVariant) {
        logger.debug('[constructS3UrlWithResolution] V2 fallback path replacement:', {
          originalSegment: segment3,
          targetVariant,
          newPath: pathParts.map((p, i) => i === 3 ? targetVariant : p).join('/')
        })
        pathParts[3] = targetVariant
        return constructS3Url(pathParts.join('/'))
      }
    }
    logger.debug('[constructS3UrlWithResolution] V2 processing failed, falling through to v1 logic')
  }

  // FALLBACK: Legacy dimension-based logic for old seller import products (v1)
  // Check if resolution is already a dimension (e.g., "80x107") vs a resolution key (e.g., "1x")
  // For PLP context, use PLP-specific dimension mapping (forces higher quality)
  const resolvedResolution = isDimensionResolution(resolution)
    ? resolution
    : context === 'plp'
      ? resolvePLPImageResolution(resolution)
      : resolveImageResolution(resolution)

  logger.debug('[constructS3UrlWithResolution] V1 processing:', {
    isDimension: isDimensionResolution(resolution),
    isPlpContext: context === 'plp',
    resolvedResolution,
    originalResolution: resolution
  })

  if (!resolvedResolution) {
    logger.debug('[constructS3UrlWithResolution] No resolved resolution, returning original')
    return constructS3Url(urlOrPath)
  }

  // Check if the path follows expected pattern: images/product/{productId}/...
  if (pathParts.length >= 4 && pathParts[0] === 'images' && pathParts[1] === 'product') {
    const segment3 = pathParts[3]

    logger.debug('[constructS3UrlWithResolution] Path pattern analysis:', {
      segment3,
      isDimension: isDimensionResolution(segment3),
      isVariant: isVariantName(segment3),
      pathLength: pathParts.length
    })

    // Case 1: Path has dimension-based resolution (old seller import pattern)
    // Example: images/product/{productId}/960x1280/{filename}.webp
    // Replace with requested resolution dimension
    if (isDimensionResolution(segment3)) {
      logger.debug('[constructS3UrlWithResolution] Case 1 - Replacing dimension:', {
        original: segment3,
        replacement: resolvedResolution
      })
      pathParts[3] = resolvedResolution
    }
    // Case 2: Path has a variant name (v2 Lambda pattern) - detected by path even without metadata
    // Example: images/product/{productId}/thumb/{filename}.webp
    // Lambda now uses consistent timestamps across all variants, so path replacement works
    else if (isVariantName(segment3)) {
      // Replace the variant name with the target variant for the requested resolution
      const targetVariant = resolveVariantName(resolution, context)
      logger.debug('[constructS3UrlWithResolution] Case 2 - Replacing variant:', {
        original: segment3,
        targetVariant,
        resolution,
        context
      })
      if (targetVariant) {
        pathParts[3] = targetVariant
      }
      const modifiedPath = pathParts.join('/')
      const finalUrl = constructS3Url(modifiedPath)
      logger.debug('[constructS3UrlWithResolution] Case 2 result:', { modifiedPath, finalUrl })
      return finalUrl
    }
    // Case 3: Path has no resolution folder (filename at position 3)
    // Example: images/product/{productId}/{filename}.webp
    else {
      logger.debug('[constructS3UrlWithResolution] Case 3 - Inserting resolution:', {
        insertPosition: 3,
        resolution: resolvedResolution,
        originalSegment3: segment3
      })
      // Insert resolution before the filename
      pathParts.splice(3, 0, resolvedResolution)
    }

    const modifiedPath = pathParts.join('/')
    const finalUrl = constructS3Url(modifiedPath)
    logger.debug('[constructS3UrlWithResolution] Final result:', {
      modifiedPath,
      finalUrl,
      originalUrl: urlOrPath
    })
    return finalUrl
  }

  // If it doesn't match the expected pattern, return the original URL
  logger.debug('[constructS3UrlWithResolution] Path pattern mismatch, returning original:', {
    pathParts,
    expectedPattern: 'images/product/{productId}/...',
    actualPattern: pathParts.slice(0, 4).join('/')
  })
  return constructS3Url(relativePath)
}

/**
 * Helper to generate image URLs for external product feeds (Google/Meta).
 * Uses full-resolution S3 URLs without injecting size-specific folders.
 */
export const getFeedImageUrls = (
  product: {
    thumbnail?: string | null
    images?: Array<{ url?: string | null, metadata?: any }>
  }
): {
  image_link: string
  additional_image_link: string
} => {
  // For feeds, use a fixed high-quality resolution (3x)
  const resolvedResolution = resolveImageResolution("5x")

  // Collect all product-level image URLs and metadata
  const productImageData: Array<{ url: string, metadata?: any }> =
    product.images
      ?.map((image: any) => ({
        url: image?.url,
        // Legacy images will have null/undefined metadata, which defaults to legacy dimension logic
        metadata: image?.metadata
      }))
      .filter((item: any): item is { url: string, metadata?: any } => !!item.url && typeof item.url === 'string') || []

  // Primary image (image_link) fallbacks:
  // 1) product.thumbnail
  // 2) first product image
  // 3) empty string
  const primaryRelative: string | undefined =
    (product.thumbnail as string | undefined) ||
    productImageData[0]?.url

  // Get metadata for primary image
  const primaryImageMetadata = product.thumbnail
    ? productImageData[0]?.metadata || undefined
    : productImageData[0]?.metadata || undefined

  const image_link = primaryRelative
    ? constructS3UrlWithResolution(primaryRelative, resolvedResolution, primaryImageMetadata)
    : ""

  // Additional images:
  // - all product images except the one used as primary (if any)
  const additionalImageData = productImageData.filter(
    (item) => !primaryRelative || item.url !== primaryRelative
  )

  const additional_image_link =
    additionalImageData
      .map((item) => constructS3UrlWithResolution(item.url, resolvedResolution, item.metadata))
      .join(",") || ""

  return {
    image_link,
    additional_image_link,
  }
}

/**
 * Middleware to transform relative image paths stored in database to full S3 URLs
 * for frontend consumption. This allows flexibility in changing S3 base URLs without
 * database updates.
 *
 * For new Lambda products with variant metadata, uses variant URLs directly.
 * For old seller import products, uses dimension-based path manipulation.
 */
export const transformProductImageUrls = (
  products: HttpTypes.AdminProduct[] | HttpTypes.StoreProduct[],
  resolution?: string,
  context?: string
): void => {
  if (!products || !Array.isArray(products)) {
    return
  }

  products.forEach((product) => {
    // Transform product images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image: any) => {
        if (image.url && typeof image.url === 'string') {
          // Pass image metadata to enable variant-based resolution (for Lambda products)
          // Legacy images will have null/undefined metadata, which defaults to legacy dimension logic
          const metadata = image.metadata || undefined
          image.url = constructS3UrlWithResolution(image.url, resolution, metadata, context)
        }
      })
    }

    // Transform product thumbnail if it exists
    // Find the image that matches the thumbnail URL to use the correct metadata
    if (product.thumbnail && typeof product.thumbnail === 'string') {
      let thumbnailMetadata: Record<string, any> | undefined = undefined

      // Try to find the specific image that matches the thumbnail URL
      if (product.images && Array.isArray(product.images)) {
        const thumbnailFilename = product.thumbnail.split('/').pop()
        const matchingImage = product.images.find((image: any) => {
          if (!image.url) return false
          const imageFilename = image.url.split('/').pop()
          return imageFilename === thumbnailFilename
        })

        // Use matching image metadata, or fallback to first image metadata
        thumbnailMetadata = matchingImage?.metadata || product.images[0]?.metadata || undefined
      }

      product.thumbnail = constructS3UrlWithResolution(product.thumbnail, resolution, thumbnailMetadata, context)
    }

    // Transform variant images if they exist
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach((variant) => {
        // Transform variant metadata images if they exist
        if (variant.metadata?.images && Array.isArray(variant.metadata.images)) {
          variant.metadata.images.forEach((image: any) => {
            if (image.url && typeof image.url === 'string') {
              const metadata = image.metadata || undefined
              image.url = constructS3UrlWithResolution(image.url, resolution, metadata, context)
            }
          })
        }

        // Transform variant metadata thumbnail if it exists
        if (variant.metadata?.thumbnail && typeof variant.metadata.thumbnail === 'string') {
          const firstVariantImageMetadata = variant.metadata.images?.[0]?.metadata || undefined
          variant.metadata.thumbnail = constructS3UrlWithResolution(variant.metadata.thumbnail, resolution, firstVariantImageMetadata, context)
        }
      })
    }
  })
}

/**
 * Middleware to transform relative image paths for a single product
 */
export const transformSingleProductImageUrls = (
  product: HttpTypes.AdminProduct | HttpTypes.StoreProduct,
  resolution?: string
): void => {
  if (!product) {
    return
  }

  transformProductImageUrls([product], resolution)
}

/**
 * PLP-specific transform for a single product that passes context="plp"
 * so constructS3UrlWithResolution uses PLP mappings for both v1 and v2 images.
 */
export const transformSingleProductImageUrlsForPLP = (
  product: HttpTypes.AdminProduct | HttpTypes.StoreProduct,
  resolution?: string,
  context?: string
): void => {
  if (!product) {
    return
  }

  transformProductImageUrls([product], resolution, context || 'plp')
}

/**
 * Helper function to generate multiple resolutions for a single image
 * @param urlOrPath - The original image path
 * @param requestedResolutions - Array of resolution keys to generate (e.g., ["2x", "3x"])
 */
export const generateMultipleResolutions = (
  urlOrPath: string,
  requestedResolutions?: string[],
  imageMetadata?: Record<string, any>,
  context?: string
): Record<string, string> => {
  const resolutions: Record<string, string> = {}

  // Use the centralized resolution mapping from helpers
  // This ensures consistency across the codebase
  const resolutionMapping = IMAGE_RESOLUTION_MAPPING

  // Determine which resolutions to generate
  // Only use resolutions that exist in our mapping to avoid 404s
  const keysToGenerate = requestedResolutions && requestedResolutions.length > 0
    ? requestedResolutions
    : Object.keys(IMAGE_RESOLUTION_MAPPING)

  keysToGenerate.forEach((key) => {
    // V2 Logic: Pass the resolution key directly (e.g., "3x") and let constructS3UrlWithResolution resolve it to a variant
    // The resolveVariantName function now handles fallback internally and context-aware PLP mapping
    if (imageMetadata?.image_version === 'v2') {
      resolutions[key] = constructS3UrlWithResolution(urlOrPath, key, imageMetadata, context)
    }
    // V1 Logic: Use the dimension mapping - let client handle 404s
    else {
      const size = resolutionMapping[key]
      if (size) {
        resolutions[key] = constructS3UrlWithResolution(urlOrPath, size, imageMetadata, context)
      }
      // No fallback - if resolution doesn't exist, don't include it
      // Client can handle 404s and choose available resolutions
    }
  })

  return resolutions
}

/**
 * Middleware to transform single product images to multiple resolutions for PDP API
 * Keeps original images array and adds a new "resolutions" field: { "1x": [...urls], "2x": [...urls] }
 * @param product - The product to transform
 * @param requestedResolutions - Array of resolution keys to generate (e.g., ["2x", "3x", "4x"])
 */
export const transformSingleProductImageUrlsWithMultipleResolutions = (
  product: HttpTypes.AdminProduct | HttpTypes.StoreProduct,
  requestedResolutions?: string[]
): void => {
  if (!product) {
    return
  }

  // Transform product images - keep original images and add new resolutions field
  if (product.images && Array.isArray(product.images)) {
    const groupedImages: Record<string, string[]> = {}

    // Get the list of resolutions to include
    const resolutionsToInclude = requestedResolutions || ["3x", "1x", "2x", "4x"]

    // Initialize arrays for each resolution
    resolutionsToInclude.forEach(key => {
      groupedImages[key] = []
    })

    // Transform each image URL to full S3 URL and generate resolution URLs
    product.images.forEach((image: any) => {
      if (image.url && typeof image.url === 'string') {
        const originalUrl = image.url
        // Update the original image URL to full S3 URL
        image.url = constructS3Url(extractRelativePath(originalUrl))

        // Generate resolution URLs
        // Pass metadata to support v2 variant resolution
        const metadata = image.metadata || undefined
        const resolutions = generateMultipleResolutions(originalUrl, requestedResolutions, metadata)

        // Add each resolution URL to the corresponding array
        Object.entries(resolutions).forEach(([key, url]) => {
          if (groupedImages[key]) {
            groupedImages[key].push(url as string)
          }
        })
      }
    })

      // Add new resolutions field (keep images array intact)
      ; (product as any).resolutions = groupedImages
  }

  // Transform product thumbnail with resolution if it exists
  if (product.thumbnail && typeof product.thumbnail === 'string') {
    logger.debug('[THUMBNAIL_DEBUG] Starting thumbnail transformation')
    logger.debug('[THUMBNAIL_DEBUG] Original thumbnail:', product.thumbnail)
    logger.debug('[THUMBNAIL_DEBUG] Requested resolutions:', requestedResolutions)

    // Find the image that matches the thumbnail URL to use the correct metadata
    let thumbnailMetadata: Record<string, any> | undefined = undefined

    if (product.images && Array.isArray(product.images)) {
      const thumbnailFilename = product.thumbnail.split('/').pop()
      logger.debug('[THUMBNAIL_DEBUG] Thumbnail filename:', thumbnailFilename)
      logger.debug('[THUMBNAIL_DEBUG] Available images count:', product.images.length)

      const matchingImage = product.images.find((image: any) => {
        if (!image.url) return false
        const imageFilename = image.url.split('/').pop()
        const matches = imageFilename === thumbnailFilename
        logger.debug('[THUMBNAIL_DEBUG] Checking image:', imageFilename, 'matches:', matches)
        return matches
      })

      thumbnailMetadata = matchingImage?.metadata || product.images[0]?.metadata || undefined
      logger.debug('[THUMBNAIL_DEBUG] Found metadata:', thumbnailMetadata)
    }

    // Apply resolution transformation if requested
    if (requestedResolutions && requestedResolutions.length > 0) {
      // Use the first requested resolution for thumbnail transformation
      const primaryResolution = requestedResolutions[0]
      logger.debug('[THUMBNAIL_DEBUG] Using primary resolution:', primaryResolution)
      const originalThumbnail = product.thumbnail
      product.thumbnail = constructS3UrlWithResolution(product.thumbnail, primaryResolution, thumbnailMetadata)
      logger.debug('[THUMBNAIL_DEBUG] Transformed from:', originalThumbnail)
      logger.debug('[THUMBNAIL_DEBUG] Transformed to:', product.thumbnail)
    } else {
      // Just convert to full S3 URL without resolution transformation
      logger.debug('[THUMBNAIL_DEBUG] No resolutions requested, converting to full S3 URL only')
      product.thumbnail = constructS3Url(extractRelativePath(product.thumbnail))
    }
  } else {
    logger.debug('[THUMBNAIL_DEBUG] No thumbnail found or invalid type')
  }

  // Transform variant images if they exist
  if (product.variants && Array.isArray(product.variants)) {
    product.variants.forEach((variant: any) => {
      // Transform variant metadata images if they exist
      if (variant.metadata?.images && Array.isArray(variant.metadata.images)) {
        const groupedVariantImages: Record<string, string[]> = {}

        // Get the list of resolutions to include
        const resolutionsToInclude = requestedResolutions || ["3x", "1x", "2x", "4x"]

        // Initialize arrays for each resolution
        resolutionsToInclude.forEach(key => {
          groupedVariantImages[key] = []
        })

        // Transform each image URL and generate resolution URLs
        variant.metadata.images.forEach((image: any) => {
          if (image.url && typeof image.url === 'string') {
            const originalUrl = image.url
            // Update the original image URL to full S3 URL
            image.url = constructS3Url(extractRelativePath(originalUrl))

            // Generate resolution URLs
            // Pass metadata to support v2 variant resolution
            const metadata = image.metadata || undefined
            const resolutions = generateMultipleResolutions(originalUrl, requestedResolutions, metadata)

            // Add each resolution URL to the corresponding array
            Object.entries(resolutions).forEach(([key, url]) => {
              if (groupedVariantImages[key]) {
                groupedVariantImages[key].push(url as string)
              }
            })
          }
        })

        // Add new resolutions field to variant metadata (keep images array intact)
        variant.metadata.resolutions = groupedVariantImages
      }

      // Transform variant metadata thumbnail if it exists
      if (variant.metadata?.thumbnail && typeof variant.metadata.thumbnail === 'string') {
        variant.metadata.thumbnail = constructS3Url(extractRelativePath(variant.metadata.thumbnail))
      }
    })
  }
}

/**
 * Helper function to transform cart thumbnails based on resolution
 */
export const transformCartThumbnails = (cart: HttpTypes.StoreCart, req: MedusaRequest): void => {
  // Get resolution from query parameter or use default
  const requestedResolution = (req.query?.resolution || req.query?.thumbnail_resolution || "3x") as string
  logger.debug('[CART_TRANSFORM_DEBUG] Transforming cart thumbnails with resolution:', requestedResolution)

  // Transform cart item thumbnails
  if (cart && cart.items && requestedResolution) {
    cart.items.forEach((item) => {
      // Transform line item thumbnail
      if (item.thumbnail && typeof item.thumbnail === 'string') {
        // Find the image that matches the thumbnail filename for v2 support
        let thumbnailMetadata: Record<string, any> | undefined = undefined

        if (item.product?.images && Array.isArray(item.product.images)) {
          const thumbnailFilename = item.thumbnail.split('/').pop()
          const matchingImage = item.product.images.find((image: any) => {
            if (!image.url) return false
            const imageFilename = image.url.split('/').pop()
            return imageFilename === thumbnailFilename
          })
          thumbnailMetadata = matchingImage?.metadata || item.product.images[0]?.metadata || undefined
        }

        logger.debug('[CART_TRANSFORM_DEBUG] Item thumbnail:', item.thumbnail, 'metadata:', thumbnailMetadata)
        item.thumbnail = constructS3UrlWithResolution(item.thumbnail, requestedResolution, thumbnailMetadata)
      }

      // Transform product thumbnail if it exists in the item
      if (item.product?.thumbnail && typeof item.product.thumbnail === 'string') {
        // Find the image that matches the product thumbnail filename for v2 support
        let productThumbnailMetadata: Record<string, any> | undefined = undefined

        if (item.product?.images && Array.isArray(item.product.images)) {
          const thumbnailFilename = item.product.thumbnail.split('/').pop()
          const matchingImage = item.product.images.find((image: any) => {
            if (!image.url) return false
            const imageFilename = image.url.split('/').pop()
            return imageFilename === thumbnailFilename
          })
          productThumbnailMetadata = matchingImage?.metadata || item.product.images[0]?.metadata || undefined
        }

        item.product.thumbnail = constructS3UrlWithResolution(item.product.thumbnail, requestedResolution, productThumbnailMetadata)
      }

      // Transform variant thumbnail if it exists in metadata
      if (item.variant?.metadata?.thumbnail && typeof item.variant.metadata.thumbnail === 'string') {
        const firstVariantImageMetadata = item.variant.metadata.images?.[0]?.metadata || undefined
        item.variant.metadata.thumbnail = constructS3UrlWithResolution(item.variant.metadata.thumbnail, requestedResolution, firstVariantImageMetadata)
      }

      // Transform variant images if they exist in metadata
      if (item.variant?.metadata?.images && Array.isArray(item.variant.metadata.images)) {
        item.variant.metadata.images.forEach((image: { url?: string, metadata?: any }) => {
          if (image.url && typeof image.url === 'string') {
            const metadata = image.metadata || undefined
            image.url = constructS3UrlWithResolution(image.url, requestedResolution, metadata)
          }
        })
      }
    })
  }
}

/**
 * Helper function to transform order thumbnails based on resolution
 */
export const transformOrderThumbnails = (order: any, resolution?: string): void => {
  // Use provided resolution or default to "3x"
  const requestedResolution = resolution || "3x"
  logger.debug('[ORDER_TRANSFORM_DEBUG] Transforming order thumbnails with resolution:', requestedResolution)

  // Transform order item thumbnails
  if (order && order.items && Array.isArray(order.items) && requestedResolution) {
    // console.log('[transformOrderThumbnails] Transforming items for order:', order.id)

    order.items.forEach((item: any) => {
      // console.log(`[transformOrderThumbnails] Item ${index}:`, {
      //   id: item.id,
      //   hasItemThumbnail: !!item.thumbnail,
      //   itemThumbnail: item.thumbnail,
      //   hasProductThumbnail: !!item.product?.thumbnail,
      //   productThumbnail: item.product?.thumbnail
      // })

      // Transform line item thumbnail
      if (item.thumbnail && typeof item.thumbnail === 'string') {
        // Find the image that matches the thumbnail filename for v2 support
        let thumbnailMetadata: Record<string, any> | undefined = undefined

        if (item.product?.images && Array.isArray(item.product.images)) {
          const thumbnailFilename = item.thumbnail.split('/').pop()
          const matchingImage = item.product.images.find((image: any) => {
            if (!image.url) return false
            const imageFilename = image.url.split('/').pop()
            return imageFilename === thumbnailFilename
          })
          thumbnailMetadata = matchingImage?.metadata || item.product.images[0]?.metadata || undefined
        }

        logger.debug('[ORDER_TRANSFORM_DEBUG] Item thumbnail:', item.thumbnail, 'metadata:', thumbnailMetadata)
        item.thumbnail = constructS3UrlWithResolution(item.thumbnail, requestedResolution, thumbnailMetadata)
      }

      // Transform product thumbnail if it exists in the item
      if (item.product?.thumbnail && typeof item.product.thumbnail === 'string') {
        // Find the image that matches the product thumbnail filename for v2 support
        let productThumbnailMetadata: Record<string, any> | undefined = undefined

        if (item.product?.images && Array.isArray(item.product.images)) {
          const thumbnailFilename = item.product.thumbnail.split('/').pop()
          const matchingImage = item.product.images.find((image: any) => {
            if (!image.url) return false
            const imageFilename = image.url.split('/').pop()
            return imageFilename === thumbnailFilename
          })
          productThumbnailMetadata = matchingImage?.metadata || item.product.images[0]?.metadata || undefined
        }

        item.product.thumbnail = constructS3UrlWithResolution(item.product.thumbnail, requestedResolution, productThumbnailMetadata)
      }

      // Transform variant thumbnail if it exists in metadata
      if (item.variant?.metadata?.thumbnail && typeof item.variant.metadata.thumbnail === 'string') {
        const firstVariantImageMetadata = item.variant.metadata.images?.[0]?.metadata || undefined
        item.variant.metadata.thumbnail = constructS3UrlWithResolution(item.variant.metadata.thumbnail, requestedResolution, firstVariantImageMetadata)
      }

      // Transform variant images if they exist in metadata
      if (item.variant?.metadata?.images && Array.isArray(item.variant.metadata.images)) {
        item.variant.metadata.images.forEach((image: { url?: string, metadata?: any }) => {
          if (image.url && typeof image.url === 'string') {
            const metadata = image.metadata || undefined
            image.url = constructS3UrlWithResolution(image.url, requestedResolution, metadata)
          }
        })
      }

      const checkCODReturnRazorpayPayoutEnabled = process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND ? JSON.parse(process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND) : false
      console.log('checkCODReturnRazorpayPayoutEnabled in transform thumbnail: ', checkCODReturnRazorpayPayoutEnabled)

      item.check_cod_return_razorpay_payout_enabled = checkCODReturnRazorpayPayoutEnabled
    })
  }
}

/**
* Helper function to transform order item image URLs
* Transforms thumbnails and product images in order items
*/
export const transformOrderImageUrls = (orders: any[], req?: MedusaRequest): void => {
  if (!orders || !Array.isArray(orders)) {
    return
  }

  // Get resolution from query parameter or use default
  const requestedResolution = req ? (req.query?.resolution || req.query?.thumbnail_resolution || "3x") as string : "3x"
  logger.debug('[ORDER_IMAGE_URLS_DEBUG] Transforming order image URLs with resolution:', requestedResolution)

  orders.forEach((order) => {
    // Transform order items
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        // Transform line item thumbnail
        if (item.thumbnail && typeof item.thumbnail === 'string') {
          // Find the image that matches the thumbnail filename for v2 support
          let thumbnailMetadata: Record<string, any> | undefined = undefined

          if (item.product?.images && Array.isArray(item.product.images)) {
            const thumbnailFilename = item.thumbnail.split('/').pop()
            const matchingImage = item.product.images.find((image: any) => {
              if (!image.url) return false
              const imageFilename = image.url.split('/').pop()
              return imageFilename === thumbnailFilename
            })
            thumbnailMetadata = matchingImage?.metadata || item.product.images[0]?.metadata || undefined
          }

          logger.debug('[ORDER_IMAGE_URLS_DEBUG] Item thumbnail:', item.thumbnail, 'metadata:', thumbnailMetadata)
          item.thumbnail = constructS3UrlWithResolution(item.thumbnail, requestedResolution, thumbnailMetadata)
        }

        // Transform product thumbnail if it exists
        if (item.product?.thumbnail && typeof item.product.thumbnail === 'string') {
          // Find the image that matches the product thumbnail filename for v2 support
          let productThumbnailMetadata: Record<string, any> | undefined = undefined

          if (item.product?.images && Array.isArray(item.product.images)) {
            const thumbnailFilename = item.product.thumbnail.split('/').pop()
            const matchingImage = item.product.images.find((image: any) => {
              if (!image.url) return false
              const imageFilename = image.url.split('/').pop()
              return imageFilename === thumbnailFilename
            })
            productThumbnailMetadata = matchingImage?.metadata || item.product.images[0]?.metadata || undefined
          }

          item.product.thumbnail = constructS3UrlWithResolution(item.product.thumbnail, requestedResolution, productThumbnailMetadata)
        }

        // Transform product images if they exist
        if (item.product?.images && Array.isArray(item.product.images)) {
          item.product.images.forEach((image: any) => {
            if (image.url && typeof image.url === 'string') {
              const metadata = image.metadata || undefined
              image.url = constructS3UrlWithResolution(image.url, requestedResolution, metadata)
            }
          })
        }

        // Transform variant thumbnail if it exists in metadata
        if (item.variant?.metadata?.thumbnail && typeof item.variant.metadata.thumbnail === 'string') {
          const firstVariantImageMetadata = item.variant.metadata.images?.[0]?.metadata || undefined
          item.variant.metadata.thumbnail = constructS3UrlWithResolution(item.variant.metadata.thumbnail, requestedResolution, firstVariantImageMetadata)
        }

        // Transform variant images if they exist in metadata
        if (item.variant?.metadata?.images && Array.isArray(item.variant.metadata.images)) {
          item.variant.metadata.images.forEach((image: any) => {
            if (image.url && typeof image.url === 'string') {
              const metadata = image.metadata || undefined
              image.url = constructS3UrlWithResolution(image.url, requestedResolution, metadata)
            }
          })
        }
      })
    }
  })
}

/**
* Helper function to transform return request image URLs
* Transforms images in orders within return requests
*/
export const transformReturnRequestImageUrls = (returnRequests: any[], req?: MedusaRequest): void => {
  if (!returnRequests || !Array.isArray(returnRequests)) {
    return
  }

  returnRequests.forEach((returnRequest) => {
    // Transform images in the order associated with the return request
    if (returnRequest.order) {
      transformOrderImageUrls([returnRequest.order], req)
    }
  })
}

/**
 * Helper function to transform return (not return request) image URLs
 * Transforms images in order_details and items within returns
 */
export const transformReturnImageUrls = (returns: any[], req?: MedusaRequest): void => {
  if (!returns || !Array.isArray(returns)) {
    return
  }

  // Get resolution from query parameter or use default
  const requestedResolution = req ? (req.query?.resolution || req.query?.thumbnail_resolution || "3x") as string : "3x"
  logger.debug('[RETURN_IMAGE_URLS_DEBUG] Transforming return image URLs with resolution:', requestedResolution)

  returns.forEach((returnItem) => {
    // Transform root thumbnail field (used by v2 API - direct from Knex query)
    if (returnItem.thumbnail && typeof returnItem.thumbnail === 'string') {
      logger.debug('[RETURN_IMAGE_URLS_DEBUG] Root thumbnail:', returnItem.thumbnail)
      // For v2 API responses, this is the main thumbnail field populated from order_line_item
      // Apply simple CDN transformation since this could be legacy or v2 image
      returnItem.thumbnail = constructS3UrlWithResolution(returnItem.thumbnail, requestedResolution, undefined)
      logger.debug('[RETURN_IMAGE_URLS_DEBUG] Transformed root thumbnail:', returnItem.thumbnail)
    }

    // Transform order_details thumbnail (added by the API)
    if (returnItem.order_details?.thumbnail && typeof returnItem.order_details.thumbnail === 'string') {
      // Find the image that matches the thumbnail filename for v2 support
      let thumbnailMetadata: Record<string, any> | undefined = undefined

      if (returnItem.order_details?.product?.images && Array.isArray(returnItem.order_details.product.images)) {
        const thumbnailFilename = returnItem.order_details.thumbnail.split('/').pop()
        const matchingImage = returnItem.order_details.product.images.find((image: any) => {
          if (!image.url) return false
          const imageFilename = image.url.split('/').pop()
          return imageFilename === thumbnailFilename
        })
        thumbnailMetadata = matchingImage?.metadata || returnItem.order_details.product.images[0]?.metadata || undefined
      }

      logger.debug('[RETURN_IMAGE_URLS_DEBUG] Return thumbnail:', returnItem.order_details.thumbnail, 'metadata:', thumbnailMetadata)
      returnItem.order_details.thumbnail = constructS3UrlWithResolution(returnItem.order_details.thumbnail, requestedResolution, thumbnailMetadata)
    }

    // Transform order_details product images if they exist
    if (returnItem.order_details?.product?.images && Array.isArray(returnItem.order_details.product.images)) {
      returnItem.order_details.product.images.forEach((image: any) => {
        if (image.url && typeof image.url === 'string') {
          const metadata = image.metadata || undefined
          image.url = constructS3UrlWithResolution(image.url, requestedResolution, metadata)
        }
      })
    }

    // Transform order_details product thumbnail
    if (returnItem.order_details?.product?.thumbnail && typeof returnItem.order_details.product.thumbnail === 'string') {
      // Find the image that matches the product thumbnail filename for v2 support
      let productThumbnailMetadata: Record<string, any> | undefined = undefined

      if (returnItem.order_details?.product?.images && Array.isArray(returnItem.order_details.product.images)) {
        const thumbnailFilename = returnItem.order_details.product.thumbnail.split('/').pop()
        const matchingImage = returnItem.order_details.product.images.find((image: any) => {
          if (!image.url) return false
          const imageFilename = image.url.split('/').pop()
          return imageFilename === thumbnailFilename
        })
        productThumbnailMetadata = matchingImage?.metadata || returnItem.order_details.product.images[0]?.metadata || undefined
      }

      returnItem.order_details.product.thumbnail = constructS3UrlWithResolution(returnItem.order_details.product.thumbnail, requestedResolution, productThumbnailMetadata)
    }

    // Transform item_details thumbnail (used in return detail page)
    if (returnItem.item_details?.thumbnail && typeof returnItem.item_details.thumbnail === 'string') {
      // Find the image that matches the thumbnail filename for v2 support
      let itemThumbnailMetadata: Record<string, any> | undefined = undefined

      if (returnItem.item_details?.product?.images && Array.isArray(returnItem.item_details.product.images)) {
        const thumbnailFilename = returnItem.item_details.thumbnail.split('/').pop()
        const matchingImage = returnItem.item_details.product.images.find((image: any) => {
          if (!image.url) return false
          const imageFilename = image.url.split('/').pop()
          return imageFilename === thumbnailFilename
        })
        itemThumbnailMetadata = matchingImage?.metadata || returnItem.item_details.product.images[0]?.metadata || undefined
      }

      returnItem.item_details.thumbnail = constructS3UrlWithResolution(returnItem.item_details.thumbnail, requestedResolution, itemThumbnailMetadata)
    }

    // Transform item_details product images if they exist
    if (returnItem.item_details?.product?.images && Array.isArray(returnItem.item_details.product.images)) {
      returnItem.item_details.product.images.forEach((image: any) => {
        if (image.url && typeof image.url === 'string') {
          const metadata = image.metadata || undefined
          image.url = constructS3UrlWithResolution(image.url, requestedResolution, metadata)
        }
      })
    }

    // Transform item_details product thumbnail
    if (returnItem.item_details?.product?.thumbnail && typeof returnItem.item_details.product.thumbnail === 'string') {
      // Find the image that matches the product thumbnail filename for v2 support
      let itemProductThumbnailMetadata: Record<string, any> | undefined = undefined

      if (returnItem.item_details?.product?.images && Array.isArray(returnItem.item_details.product.images)) {
        const thumbnailFilename = returnItem.item_details.product.thumbnail.split('/').pop()
        const matchingImage = returnItem.item_details.product.images.find((image: any) => {
          if (!image.url) return false
          const imageFilename = image.url.split('/').pop()
          return imageFilename === thumbnailFilename
        })
        itemProductThumbnailMetadata = matchingImage?.metadata || returnItem.item_details.product.images[0]?.metadata || undefined
      }

      returnItem.item_details.product.thumbnail = constructS3UrlWithResolution(returnItem.item_details.product.thumbnail, requestedResolution, itemProductThumbnailMetadata)
    }

    // Transform items if they exist
    if (returnItem.items && Array.isArray(returnItem.items)) {
      returnItem.items.forEach((item: any) => {
        // Transform item thumbnail
        if (item.item?.thumbnail && typeof item.item.thumbnail === 'string') {
          // Find the image that matches the item thumbnail filename for v2 support
          let itemThumbnailMetadata: Record<string, any> | undefined = undefined

          if (item.item?.product?.images && Array.isArray(item.item.product.images)) {
            const thumbnailFilename = item.item.thumbnail.split('/').pop()
            const matchingImage = item.item.product.images.find((image: any) => {
              if (!image.url) return false
              const imageFilename = image.url.split('/').pop()
              return imageFilename === thumbnailFilename
            })
            itemThumbnailMetadata = matchingImage?.metadata || item.item.product.images[0]?.metadata || undefined
          }

          item.item.thumbnail = constructS3UrlWithResolution(item.item.thumbnail, requestedResolution, itemThumbnailMetadata)
        }

        // Transform item product thumbnail
        if (item.item?.product?.thumbnail && typeof item.item.product.thumbnail === 'string') {
          // Find the image that matches the product thumbnail filename for v2 support
          let productThumbnailMetadata: Record<string, any> | undefined = undefined

          if (item.item?.product?.images && Array.isArray(item.item.product.images)) {
            const thumbnailFilename = item.item.product.thumbnail.split('/').pop()
            const matchingImage = item.item.product.images.find((image: any) => {
              if (!image.url) return false
              const imageFilename = image.url.split('/').pop()
              return imageFilename === thumbnailFilename
            })
            productThumbnailMetadata = matchingImage?.metadata || item.item.product.images[0]?.metadata || undefined
          }

          item.item.product.thumbnail = constructS3UrlWithResolution(item.item.product.thumbnail, requestedResolution, productThumbnailMetadata)
        }

        // Transform item product images
        if (item.item?.product?.images && Array.isArray(item.item.product.images)) {
          item.item.product.images.forEach((image: any) => {
            if (image.url && typeof image.url === 'string') {
              const metadata = image.metadata || undefined
              image.url = constructS3UrlWithResolution(image.url, requestedResolution, metadata)
            }
          })
        }

        // Transform variant thumbnail if it exists in metadata
        if (item.item?.variant?.metadata?.thumbnail && typeof item.item.variant.metadata.thumbnail === 'string') {
          const firstVariantImageMetadata = item.item?.variant?.metadata?.images?.[0]?.metadata || undefined
          item.item.variant.metadata.thumbnail = constructS3UrlWithResolution(item.item.variant.metadata.thumbnail, requestedResolution, firstVariantImageMetadata)
        }

        // Transform variant images if they exist in metadata
        if (item.item?.variant?.metadata?.images && Array.isArray(item.item.variant.metadata.images)) {
          item.item.variant.metadata.images.forEach((image: any) => {
            if (image.url && typeof image.url === 'string') {
              const metadata = image.metadata || undefined
              image.url = constructS3UrlWithResolution(image.url, requestedResolution, metadata)
            }
          })
        }
      })
    }
  })
}

/**
* Middleware to transform order image URLs in responses
* Intercepts order API responses and transforms relative image paths to full S3 URLs
* Can be used for both admin and store order routes
*/
export const transformOrderImagesMiddleware = async (
  req: MedusaRequest,
  res: any,
  next: any
) => {
  // Store the original json method
  const originalJson = res.json.bind(res)

  // Override the json method to transform images before sending
  res.json = function (body: any) {
    if (body) {
      // Handle single order response (order detail page)
      if (body.order) {
        transformOrderImageUrls([body.order], req)
      }
      // Handle multiple orders response (order list page)
      else if (body.orders && Array.isArray(body.orders)) {
        transformOrderImageUrls(body.orders, req)
      }
      // Handle order_sets response (store orders grouped by order set)
      else if (body.order_sets && Array.isArray(body.order_sets)) {
        // Transform images in each order within order sets
        body.order_sets.forEach((orderSet: any) => {
          if (orderSet.orders && Array.isArray(orderSet.orders)) {
            transformOrderImageUrls(orderSet.orders, req)
          }
        })
      }
    }

    return originalJson(body)
  }

  next()
}

/**
* Middleware to transform return request image URLs in responses
* Intercepts return request API responses and transforms relative image paths to full S3 URLs
* Can be used for both admin and store return request routes
*/
export const transformReturnRequestImagesMiddleware = async (
  req: MedusaRequest,
  res: any,
  next: any
) => {
  // Store the original json method
  const originalJson = res.json.bind(res)

  // Override the json method to transform images before sending
  res.json = function (body: any) {
    if (body) {
      // Handle single return request response (return request detail page)
      if (body.order_return_request) {
        transformReturnRequestImageUrls([body.order_return_request], req)
      }
      // Handle multiple return requests response (return request list page)
      else if (body.order_return_requests && Array.isArray(body.order_return_requests)) {
        transformReturnRequestImageUrls(body.order_return_requests, req)
      }
    }

    return originalJson(body)
  }

  next()
}

/**
 * Middleware to transform return (not return request) image URLs in responses
 * Intercepts return API responses and transforms relative image paths to full S3 URLs
 * Can be used for both admin and store return routes
 */
export const transformReturnImagesMiddleware = async (
  req: MedusaRequest,
  res: any,
  next: any
) => {
  // Store the original json method
  const originalJson = res.json.bind(res)

  // Override the json method to transform images before sending
  res.json = function (body: any) {
    if (body) {
      // Handle single return response (return detail page)
      if (body.return) {
        transformReturnImageUrls([body.return], req)
      }
      // Handle multiple returns response (return list page)
      else if (body.returns && Array.isArray(body.returns)) {
        transformReturnImageUrls(body.returns, req)
      }
    }

    return originalJson(body)
  }

  next()
}
