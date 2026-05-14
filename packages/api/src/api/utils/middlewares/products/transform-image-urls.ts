import { HttpTypes } from "@medusajs/framework/types"
import { MedusaRequest } from "@medusajs/framework/http"
import { constructS3Url, extractRelativePath } from "../../../../shared/utils/common"

import {
  IMAGE_RESOLUTION_MAPPING,
  IMAGE_RESOLUTION_TO_VARIANT,
  DEFAULT_RESOLUTION_KEYS,
} from "../../../store/products/image-constants"

// =============================================================================
// LOW-LEVEL RESOLUTION UTILITIES
// =============================================================================

const isDimensionResolution = (segment: string): boolean => /^\d+x\d+$/.test(segment)

const isVariantName = (segment: string): boolean =>
  ["thumb", "small", "medium", "large", "xlarge"].includes(segment)

export const resolveImageResolution = (resolution?: string): string | undefined => {
  if (!resolution) return undefined
  return IMAGE_RESOLUTION_MAPPING[resolution]
}

export const findNearestLowerResolutionKey = (
  requestedResolution: string,
  availableResolutions: Record<string, string>
): string | undefined => {
  const requestedNum = parseFloat(requestedResolution.replace("x", ""))
  if (Number.isNaN(requestedNum)) return undefined

  const availableKeys = Object.keys(availableResolutions)
    .map((key) => ({ key, num: parseFloat(key.replace("x", "")) }))
    .filter((item) => !Number.isNaN(item.num) && item.num <= requestedNum)
    .sort((a, b) => b.num - a.num)

  return availableKeys.length > 0 ? availableKeys[0].key : undefined
}

export const resolveVariantName = (resolution?: string): string | undefined => {
  if (!resolution) return undefined
  const mapping = IMAGE_RESOLUTION_TO_VARIANT
  if (mapping[resolution]) return mapping[resolution]
  const fallbackKey = findNearestLowerResolutionKey(resolution, mapping)
  return fallbackKey ? mapping[fallbackKey] : undefined
}

export const constructS3UrlWithResolution = (
  urlOrPath: string,
  resolution?: string,
  imageMetadata?: Record<string, any>
): string => {
  if (!resolution || !urlOrPath) return constructS3Url(urlOrPath)

  const relativePath = extractRelativePath(urlOrPath)
  const pathParts = relativePath.split("/")

  if (imageMetadata?.image_version === "v2") {
    const targetVariant = resolveVariantName(resolution)

    if (imageMetadata.variant_urls && targetVariant && imageMetadata.variant_urls[targetVariant]) {
      return constructS3Url(imageMetadata.variant_urls[targetVariant])
    }

    if (pathParts.length >= 4 && pathParts[0] === "images" && pathParts[1] === "product") {
      const segment3 = pathParts[3]
      if (isVariantName(segment3) && targetVariant) {
        pathParts[3] = targetVariant
        return constructS3Url(pathParts.join("/"))
      }
    }
  }

  const resolvedResolution = isDimensionResolution(resolution)
    ? resolution
    : resolveImageResolution(resolution)

  if (!resolvedResolution) return constructS3Url(urlOrPath)

  if (pathParts.length >= 4 && pathParts[0] === "images" && pathParts[1] === "product") {
    const segment3 = pathParts[3]
    if (isDimensionResolution(segment3)) {
      pathParts[3] = resolvedResolution
    } else if (isVariantName(segment3)) {
      const targetVariant = resolveVariantName(resolution)
      if (targetVariant) pathParts[3] = targetVariant
    } else {
      pathParts.splice(3, 0, resolvedResolution)
    }
    return constructS3Url(pathParts.join("/"))
  }

  return constructS3Url(relativePath)
}

// =============================================================================
// SHARED IMAGE TRANSFORM HELPERS
// (private – used by all higher-level transform functions below)
// =============================================================================

/** Extract resolution from request query, defaulting to "3x". */
const getRequestedResolution = (req?: MedusaRequest): string =>
  (req?.query?.resolution || req?.query?.thumbnail_resolution || "3x") as string

/** Find metadata for a thumbnail by matching filename against an images array. */
const getMetadataFromImages = (
  thumbnail: string,
  images?: any[]
): Record<string, any> | undefined => {
  if (!thumbnail || !Array.isArray(images) || images.length === 0) return undefined
  const filename = thumbnail.split("/").pop()
  const match = images.find((img) => img?.url?.split("/").pop() === filename)
  return match?.metadata || images[0]?.metadata
}

/** Transform a single thumbnail URL, resolving its metadata from the images array. */
const transformThumbnail = (thumbnail: string, resolution: string, images?: any[]): string => {
  if (!thumbnail || typeof thumbnail !== "string") return thumbnail
  return constructS3UrlWithResolution(thumbnail, resolution, getMetadataFromImages(thumbnail, images))
}

/** Transform an array of image objects in-place. */
const transformImages = (images?: any[], resolution?: string): void => {
  if (!Array.isArray(images)) return
  images.forEach((img) => {
    if (img?.url && typeof img.url === "string") {
      img.url = constructS3UrlWithResolution(img.url, resolution!, img.metadata || undefined)
    }
  })
}

/** Transform product-level images and thumbnail in-place. */
const transformProductBlock = (product: any, resolution: string): void => {
  if (!product) return
  transformImages(product.images, resolution)
  if (product.thumbnail) {
    product.thumbnail = transformThumbnail(product.thumbnail, resolution, product.images)
  }
}

/**
 * Transform all image fields on a single order/cart line item.
 *
 * Thumbnails are resolved before product images are mutated so that the
 * filename-based metadata lookup still works against original paths.
 *
 * @param includeProductImages - pass true for order routes (which expose
 *   item.product.images), false for cart routes (which don't).
 */
const transformLineItem = (
  item: any,
  resolution: string,
  includeProductImages: boolean
): void => {
  if (!item) return

  // item-level thumbnail
  if (item.thumbnail && typeof item.thumbnail === "string") {
    item.thumbnail = transformThumbnail(item.thumbnail, resolution, item.product?.images)
  }

  // product thumbnail (resolve metadata before images are mutated)
  if (item.product?.thumbnail && typeof item.product.thumbnail === "string") {
    item.product.thumbnail = transformThumbnail(
      item.product.thumbnail,
      resolution,
      item.product?.images
    )
  }

  // product images (only for order routes)
  if (includeProductImages) {
    transformImages(item.product?.images, resolution)
  }

  // variant metadata thumbnail
  if (
    item.variant?.metadata?.thumbnail &&
    typeof item.variant.metadata.thumbnail === "string"
  ) {
    item.variant.metadata.thumbnail = constructS3UrlWithResolution(
      item.variant.metadata.thumbnail,
      resolution,
      item.variant.metadata.images?.[0]?.metadata || undefined
    )
  }

  // variant metadata images
  transformImages(item.variant?.metadata?.images, resolution)
}

/** Wrap res.json to run a transform callback on the response body before sending. */
const wrapJsonWithTransform = (res: any, transform: (body: any) => void): void => {
  const originalJson = res.json.bind(res)
  res.json = function (body: any) {
    if (body) transform(body)
    return originalJson(body)
  }
}

// =============================================================================
// PDP IMAGE TRANSFORMS
// =============================================================================

type ImageLike = {
  url?: string | null
  metadata?: Record<string, any> | null
}

/**
 * Generate multiple resolutions for a single image.
 * Used by PDP responses that return a `resolutions` map.
 */
export const generateMultipleResolutions = (
  urlOrPath: string,
  requestedResolutions?: string[],
  imageMetadata?: Record<string, any>
): Record<string, string> => {
  const resolutions: Record<string, string> = {}
  const keysToGenerate =
    requestedResolutions && requestedResolutions.length > 0
      ? requestedResolutions
      : Object.keys(IMAGE_RESOLUTION_MAPPING)

  const isV2 = imageMetadata?.image_version === "v2"

  for (const key of keysToGenerate) {
    if (isV2) {
      resolutions[key] = constructS3UrlWithResolution(urlOrPath, key, imageMetadata)
      continue
    }
    const size = IMAGE_RESOLUTION_MAPPING[key]
    if (!size) continue
    resolutions[key] = constructS3UrlWithResolution(urlOrPath, size, imageMetadata)
  }

  return resolutions
}

const PDP_DEFAULT_RESOLUTIONS = [...DEFAULT_RESOLUTION_KEYS]

const initResolutionMap = (resolutions: string[]) => {
  const map: Record<string, string[]> = {}
  resolutions.forEach((r) => (map[r] = []))
  return map
}

const appendGroupedResolutionsForImage = (params: {
  originalUrl: string
  metadata?: Record<string, any>
  keys: readonly string[]
  grouped: Record<string, string[]>
}) => {
  const { originalUrl, metadata, keys, grouped } = params
  const isV2 = metadata?.image_version === "v2"

  for (const key of keys) {
    const resolutionOrSize = isV2 ? key : IMAGE_RESOLUTION_MAPPING[key]
    if (!resolutionOrSize) continue
    const url = constructS3UrlWithResolution(originalUrl, resolutionOrSize, metadata)
    if (url) grouped[key].push(url)
  }
}

const processImages = (images: ImageLike[], requestedResolutions?: string[]) => {
  if (!Array.isArray(images)) return undefined

  const resolutionsToInclude =
    requestedResolutions && requestedResolutions.length > 0
      ? requestedResolutions
      : PDP_DEFAULT_RESOLUTIONS

  const grouped = initResolutionMap(resolutionsToInclude)

  for (const image of images) {
    if (!image?.url || typeof image.url !== "string") continue
    const originalUrl = image.url
    image.url = constructS3Url(extractRelativePath(originalUrl))
    appendGroupedResolutionsForImage({
      originalUrl,
      metadata: image.metadata || undefined,
      keys: resolutionsToInclude,
      grouped,
    })
  }

  return grouped
}

const processThumbnail = (
  thumbnail: string,
  images: ImageLike[],
  requestedResolutions?: string[]
) => {
  if (!thumbnail || typeof thumbnail !== "string") return thumbnail

  let metadata: Record<string, any> | undefined

  if (Array.isArray(images) && images.length > 0) {
    const filename = thumbnail.split("/").pop()
    const match = images.find((img) => img?.url?.split("/").pop() === filename)
    metadata = (match?.metadata as any) || (images[0]?.metadata as any) || undefined
  }

  if (requestedResolutions?.length) {
    return constructS3UrlWithResolution(thumbnail, requestedResolutions[0], metadata)
  }

  return constructS3Url(extractRelativePath(thumbnail))
}

/** PDP: Transform a product's images into CDN URLs and attach a `resolutions` map. */
export const transformSingleProductImageUrlsWithMultipleResolutions = (
  product: HttpTypes.AdminProduct | HttpTypes.StoreProduct,
  requestedResolutions?: string[]
): void => {
  if (!product) return

  if (Array.isArray(product.images)) {
    const grouped = processImages(product.images, requestedResolutions)
    if (grouped) {
      ;(product as any).resolutions = grouped
    }
  }

  if (product.thumbnail) {
    product.thumbnail = processThumbnail(
      product.thumbnail,
      product.images || [],
      requestedResolutions
    )
  }

  if (Array.isArray(product.variants)) {
    product.variants.forEach((variant: any) => {
      const images = variant.metadata?.images
      if (Array.isArray(images)) {
        const grouped = processImages(images, requestedResolutions)
        if (grouped) variant.metadata.resolutions = grouped
      }
      if (variant.metadata?.thumbnail) {
        variant.metadata.thumbnail = constructS3Url(
          extractRelativePath(variant.metadata.thumbnail)
        )
      }
    })
  }
}

// =============================================================================
// FEED IMAGE HELPERS
// =============================================================================

/** Generate image URLs for external product feeds (Google/Meta). */
export const getFeedImageUrls = (
  product: {
    thumbnail?: string | null
    images?: Array<{ url?: string | null; metadata?: any }>
  }
): { image_link: string; additional_image_link: string } => {
  const resolvedResolution = resolveImageResolution("5x")

  const productImageData: Array<{ url: string; metadata?: any }> =
    product.images
      ?.map((image: any) => ({ url: image?.url, metadata: image?.metadata }))
      .filter(
        (item: any): item is { url: string; metadata?: any } =>
          !!item.url && typeof item.url === "string"
      ) || []

  const primaryRelative: string | undefined =
    (product.thumbnail as string | undefined) || productImageData[0]?.url

  const primaryImageMetadata = productImageData[0]?.metadata || undefined

  const image_link = primaryRelative
    ? constructS3UrlWithResolution(primaryRelative, resolvedResolution, primaryImageMetadata)
    : ""

  const additionalImageData = productImageData.filter(
    (item) => !primaryRelative || item.url !== primaryRelative
  )

  const additional_image_link =
    additionalImageData
      .map((item) => constructS3UrlWithResolution(item.url, resolvedResolution, item.metadata))
      .join(",") || ""

  return { image_link, additional_image_link }
}

// =============================================================================
// PRODUCT IMAGE TRANSFORMS
// =============================================================================

export const transformProductImageUrls = (
  products: HttpTypes.AdminProduct[] | HttpTypes.StoreProduct[],
  resolution?: string
): void => {
  if (!products || !Array.isArray(products)) return

  products.forEach((product) => {
    transformImages(product.images as any[], resolution)

    if (product.thumbnail && typeof product.thumbnail === "string") {
      product.thumbnail = transformThumbnail(
        product.thumbnail,
        resolution!,
        product.images as any[]
      )
    }

    // if (product.variants && Array.isArray(product.variants)) {
    //   product.variants.forEach((variant) => {
    //     transformImages(variant.metadata?.images as any[], resolution)

    //     if (
    //       variant.metadata?.thumbnail &&
    //       typeof variant.metadata.thumbnail === "string"
    //     ) {
    //       variant.metadata.thumbnail = constructS3UrlWithResolution(
    //         variant.metadata.thumbnail,
    //         resolution,
    //         variant.metadata.images?.[0]?.metadata || undefined
    //       )
    //     }
    //   })
    // }
  })
}

export const transformSingleProductImageUrls = (
  product: HttpTypes.AdminProduct | HttpTypes.StoreProduct,
  resolution?: string
): void => {
  if (!product) return
  transformProductImageUrls([product], resolution)
}

/** @deprecated Identical to transformSingleProductImageUrls – use that directly. */
export const transformSingleProductImageUrlsForPLP = transformSingleProductImageUrls

// =============================================================================
// CART IMAGE TRANSFORMS
// =============================================================================

export const transformCartThumbnails = (cart: HttpTypes.StoreCart, req: MedusaRequest): void => {
  const resolution = getRequestedResolution(req)
  if (!cart?.items) return
  cart.items.forEach((item) => transformLineItem(item, resolution, false))
}

// =============================================================================
// ORDER IMAGE TRANSFORMS
// =============================================================================

export const transformOrderThumbnails = (order: any, resolution?: string): void => {
  const requestedResolution = resolution || "3x"
  if (!order?.items || !Array.isArray(order.items)) return

  const codPayoutEnabled = process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND
    ? JSON.parse(process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND)
    : false

  order.items.forEach((item: any) => {
    transformLineItem(item, requestedResolution, false)
    item.check_cod_return_razorpay_payout_enabled = codPayoutEnabled
  })
}

export const transformOrderImageUrls = (orders: any[], req?: MedusaRequest): void => {
  if (!Array.isArray(orders)) return
  const resolution = getRequestedResolution(req)
  orders.forEach((order) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => transformLineItem(item, resolution, true))
    }
  })
}

export const transformReturnRequestImageUrls = (
  returnRequests: any[],
  req?: MedusaRequest
): void => {
  if (!Array.isArray(returnRequests)) return
  returnRequests.forEach((returnRequest) => {
    if (returnRequest.order) transformOrderImageUrls([returnRequest.order], req)
  })
}

// =============================================================================
// RETURN IMAGE TRANSFORMS
// =============================================================================

export const transformReturnImageUrls = (returns: any[], req?: MedusaRequest): void => {
  if (!Array.isArray(returns)) return
  const resolution = getRequestedResolution(req)

  returns.forEach((r) => {
    if (r.thumbnail) {
      r.thumbnail = constructS3UrlWithResolution(r.thumbnail, resolution, undefined)
    }

    if (r.order_details) {
      const product = r.order_details.product
      if (r.order_details.thumbnail) {
        r.order_details.thumbnail = transformThumbnail(
          r.order_details.thumbnail,
          resolution,
          product?.images
        )
      }
      transformProductBlock(product, resolution)
    }

    if (r.item_details) {
      const product = r.item_details.product
      if (r.item_details.thumbnail) {
        r.item_details.thumbnail = transformThumbnail(
          r.item_details.thumbnail,
          resolution,
          product?.images
        )
      }
      transformProductBlock(product, resolution)
    }

    if (Array.isArray(r.items)) {
      r.items.forEach((item: any) => {
        const product = item.item?.product
        if (item.item?.thumbnail) {
          item.item.thumbnail = transformThumbnail(
            item.item.thumbnail,
            resolution,
            product?.images
          )
        }
        transformProductBlock(product, resolution)

        const variant = item.item?.variant
        if (variant?.metadata?.thumbnail) {
          variant.metadata.thumbnail = constructS3UrlWithResolution(
            variant.metadata.thumbnail,
            resolution,
            variant.metadata.images?.[0]?.metadata || undefined
          )
        }
        transformImages(variant?.metadata?.images, resolution)
      })
    }
  })
}

// =============================================================================
// RESPONSE MIDDLEWARE
// =============================================================================

export const transformOrderImagesMiddleware = async (
  req: MedusaRequest,
  res: any,
  next: any
) => {
  wrapJsonWithTransform(res, (body) => {
    if (body.order) {
      transformOrderImageUrls([body.order], req)
    } else if (body.orders && Array.isArray(body.orders)) {
      transformOrderImageUrls(body.orders, req)
    } else if (body.order_sets && Array.isArray(body.order_sets)) {
      body.order_sets.forEach((orderSet: any) => {
        if (orderSet.orders && Array.isArray(orderSet.orders)) {
          transformOrderImageUrls(orderSet.orders, req)
        }
      })
    }
  })
  next()
}

export const transformReturnRequestImagesMiddleware = async (
  req: MedusaRequest,
  res: any,
  next: any
) => {
  wrapJsonWithTransform(res, (body) => {
    if (body.order_return_request) {
      transformReturnRequestImageUrls([body.order_return_request], req)
    } else if (body.order_return_requests && Array.isArray(body.order_return_requests)) {
      transformReturnRequestImageUrls(body.order_return_requests, req)
    }
  })
  next()
}

export const transformReturnImagesMiddleware = async (
  req: MedusaRequest,
  res: any,
  next: any
) => {
  wrapJsonWithTransform(res, (body) => {
    if (body.return) {
      transformReturnImageUrls([body.return], req)
    } else if (body.returns && Array.isArray(body.returns)) {
      transformReturnImageUrls(body.returns, req)
    }
  })
  next()
}
