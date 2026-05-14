import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { ProductEvents } from '../../../../shared/events/product-events'

/**
 * POST /hooks/enhanced-import/image-callback
 * Receives callbacks from Lambda after image processing
 * Authenticated via X-Zilo-Lambda-Key header (custom auth, no Medusa admin auth)
 *
 * Two Status Types:
 * - processing_status: 'success'/'partial'/'failed' - how image processing went
 * - target_status: The desired product status (e.g., 'published') from original SQS message
 *
 * Product Status Update Logic:
 * - PROCESSING SUCCESS: Updates product status to target_status, clears processing metadata
 * - PROCESSING PARTIAL: Keeps current status, creates images for successful ones, stores retry metadata
 * - PROCESSING FAILED: Keeps current status as draft, stores error information
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
): Promise<void> {
    const logger = req.scope.resolve('logger')

    // Authenticate request (removed sensitive logging)
    const apiKey = req.headers['x-zilo-lambda-key'] as string
    const expectedKey = process.env.IMAGE_CALLBACK_API_KEY

    logger.info(`[imageCallback] Authenticating request: ${apiKey ? 'Key provided' : 'No key'}`)

    if (!apiKey || apiKey !== expectedKey) {
        logger.warn('[imageCallback] Unauthorized callback attempt')
        res.status(401).json({ message: 'Unauthorized' })
        return
    }

    // Type the request body - clean Lambda payload structure
    const body = req.body as {
        product_id?: string
        processing_status?: 'success' | 'failed' | 'partial'  // How image processing went
        target_status?: string  // Desired product status from SQS (e.g., 'published')
        variants?: Record<string, string | string[]>  // Can be single URL or array
        error?: string
        metadata?: Record<string, any>
        timestamp?: string  // Lambda processing timestamp
        image_processor_version?: string
        processed_images?: Array<{ url: string; variants: Record<string, string>; status: 'success' | 'failed'; error?: string }>
        successful_count?: number  // Number of successfully processed images
        total_count?: number  // Total number of images processed
    }

    // DEBUG: Log the raw received payload (uses Medusa's LOG_LEVEL)
    logger.debug(`[imageCallback] Raw payload: product_id=${body.product_id}, processing_status=${body.processing_status}, ` +
        `successful_count=${body.successful_count}, total_count=${body.total_count}, ` +
        `hasVariants=${!!body.variants}, variantKeys=${body.variants ? Object.keys(body.variants).join(',') : 'none'}, ` +
        `variantStructure=${body.variants ? JSON.stringify(Object.fromEntries(
            Object.entries(body.variants).map(([k, v]) => [k, Array.isArray(v) ? `array[${v.length}]` : typeof v])
        )) : null}`)

    const { product_id, processing_status, target_status, variants, error, metadata } = body

    if (!product_id) {
        res.status(400).json({ message: 'product_id is required' })
        return
    }

    try {
        // Correctly resolve product service using Modules constant (Medusa v2 pattern)
        const productService = req.scope.resolve(Modules.PRODUCT) as any

        // Retrieve product - handle not found case
        let product
        try {
            logger.info(`[imageCallback] Looking up product: ${product_id}`)
            product = await productService.retrieveProduct(product_id, {
                select: ['id', 'status', 'metadata']
            })
            logger.info(`[imageCallback] Product found: ${product?.id}, status: ${product?.status}`)
        } catch (retrieveError: any) {
            // Product not found - return 404 instead of 500
            logger.error(`[imageCallback] Product lookup error type: ${retrieveError.type}, message: ${retrieveError.message}`)
            if (retrieveError.type === 'not_found' || retrieveError.message?.includes('not found')) {
                logger.error(`[imageCallback] Product not found: ${product_id}`)
                res.status(404).json({ message: `Product not found: ${product_id}` })
                return
            }
            throw retrieveError  // Re-throw other errors
        }

        if (!product) {
            logger.error(`[imageCallback] Product not found: ${product_id}`)
            res.status(404).json({ message: 'Product not found' })
            return
        }

        if ((processing_status === 'success' || processing_status === 'partial') && variants) {
            // Success or Partial: Create Image records, decide final product status
            const desiredTargetStatus = target_status || product.metadata?._target_status || 'draft'

            // Only update to target status on complete processing success
            // Partial success keeps current status with partial processing metadata
            const finalProductStatus = processing_status === 'success' ? desiredTargetStatus : product.status

            // Helper function to strip CDN domain and get relative path
            // This ensures consistency with seller import which stores relative paths
            const stripCdnDomain = (url: string): string => {
                if (!url) return ''
                // If already relative, return as-is
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    return url
                }
                // Extract everything after the domain
                const match = url.match(/^https?:\/\/[^/]+\/(.+)$/)
                return match?.[1] || url
            }

            // Build image records with ALL variant paths in metadata
            // variants structure: { thumb: [url1, url2], small: [url1, url2], ... }
            const imageRecords: Array<{ url: string; metadata: Record<string, any> }> = []

            // Use xlarge as the canonical image list (stored in image.url column)
            const xlargeUrls = Array.isArray(variants.xlarge) ? variants.xlarge : [variants.xlarge]

            // DEBUG: Log xlargeUrls array (uses Medusa's LOG_LEVEL)
            logger.debug(`[imageCallback] Processing xlargeUrls: isArray=${Array.isArray(variants.xlarge)}, count=${xlargeUrls.length}, urls=${JSON.stringify(xlargeUrls)}`)

            xlargeUrls.forEach((xlargeUrl, index) => {
                if (xlargeUrl) {
                    // Store relative path for main URL (consistent with seller import)
                    const imageMetadata: Record<string, any> = {
                        image_version: 'v2',  // Mark as Lambda variant-based image
                        processed_at: body.timestamp || new Date().toISOString(),
                    }

                    // Add processing status info
                    if (processing_status === 'partial') {
                        const successCount = body.successful_count || 0
                        const totalCount = body.total_count || 0
                        const failureCount = totalCount - successCount

                        imageMetadata.partial_processing = {
                            success_count: successCount,
                            failure_count: failureCount,
                            total_count: totalCount,
                            status: 'requires_retry'  // Mark for potential reprocessing
                        }
                    } else {
                        imageMetadata.processing_status = 'complete'
                        if (body.total_count) {
                            imageMetadata.total_processed = body.total_count
                            imageMetadata.successful_processed = body.successful_count
                        }
                    }

                    // Store all variant URLs in metadata for efficient frontend access
                    const variantUrls: Record<string, string> = {}
                    Object.entries(variants).forEach(([variantName, urls]) => {
                        if (Array.isArray(urls)) {
                            variantUrls[variantName] = stripCdnDomain(urls[index] || '')
                        } else {
                            variantUrls[variantName] = stripCdnDomain(String(urls))
                        }
                    })
                    imageMetadata.variant_urls = variantUrls

                    imageRecords.push({
                        url: stripCdnDomain(String(xlargeUrl)),
                        metadata: imageMetadata
                    })
                }
            })

            // Set thumbnail to first image
            const thumbnailUrl = imageRecords[0]?.url || null

            // DEBUG: Log the final imageRecords before product update (uses Medusa's LOG_LEVEL)
            logger.debug(`[imageCallback] Final imageRecords: count=${imageRecords.length}, thumbnail=${thumbnailUrl}, ` +
                `records=${JSON.stringify(imageRecords.map((r, i) => ({
                    index: i,
                    url: r.url,
                    variantUrlsCount: r.metadata?.variant_urls ? Object.keys(r.metadata.variant_urls).length : 0
                })))}`)

            // Prepare metadata update
            const metadataUpdate: Record<string, any> = {
                ...product.metadata,
                ...(metadata || {}),
                _last_processed_at: new Date().toISOString()
            }

            // Only clear processing metadata on full processing success
            if (processing_status === 'success') {
                // Full success - clear all processing metadata and move to target status
                metadataUpdate._target_status = undefined
                metadataUpdate._pending_images = undefined
                metadataUpdate._processing_error = undefined
                metadataUpdate._processing_failed_at = undefined
                metadataUpdate._partial_processing = undefined  // Clear any previous partial processing
            } else {
                // Partial success - keep processing metadata for retry, add partial info
                const successCount = body.successful_count || 0
                const totalCount = body.total_count || 0
                const failureCount = totalCount - successCount

                metadataUpdate._partial_processing = {
                    success_count: successCount,
                    failure_count: failureCount,
                    total_count: totalCount,
                    last_attempt_at: new Date().toISOString(),
                    requires_retry: true,
                    target_status: desiredTargetStatus  // Store target status for retry
                }
            }

            await productService.updateProducts(product_id, {
                status: finalProductStatus,
                images: imageRecords,
                thumbnail: thumbnailUrl,
                metadata: metadataUpdate
            })

            // Emit Algolia event to re-sync product with new images
            try {
                req.scope.resolve(Modules.EVENT_BUS).emit({
                    name: ProductEvents.PRODUCTS_CHANGED,
                    data: { ids: [product_id] }
                })

                logger.debug(`[imageCallback] Emitted Algolia sync event for ${product_id}`)
            } catch (algoliaError) {
                // Don't fail the callback if Algolia sync fails
                logger.warn(`[imageCallback] Failed to emit Algolia event for ${product_id}: ${algoliaError}`)
            }

            // Calculate counts from new payload fields
            const successCount = body.successful_count || imageRecords.length
            const totalCount = body.total_count || imageRecords.length
            const failureCount = totalCount - successCount

            const logMessage = processing_status === 'partial'
                ? `Partially processed ${imageRecords.length} images for ${product_id} (${successCount} success, ${failureCount} failed)`
                : `Successfully processed ${imageRecords.length} images for ${product_id}`

            logger.info(`[imageCallback] ${logMessage}, final status: ${finalProductStatus}, target: ${desiredTargetStatus}`)

            res.status(200).json({
                message: processing_status === 'partial' ? 'Partial Success' : 'Success',
                product_id,
                status: finalProductStatus,
                target_status: processing_status === 'success' ? desiredTargetStatus : undefined,
                images_created: imageRecords.length,
                processing_complete: processing_status === 'success',
                image_processor_version: body.image_processor_version,
                ...(processing_status === 'partial' ? {
                    success_count: successCount,
                    failure_count: failureCount,
                    total_count: totalCount,
                    requires_retry: true
                } : {
                    total_processed: totalCount,
                    successful_processed: successCount
                })
            })
        } else if (processing_status === 'failed') {
            // Failure: keep current status and log error
            await productService.updateProducts(product_id, {
                status: product.status || 'draft',  // Keep current status, fallback to draft
                metadata: {
                    ...product.metadata,
                    _processing_error: error,
                    _processing_failed_at: new Date().toISOString(),
                    _failed_target_status: target_status  // Store what we were trying to achieve
                }
            })

            logger.error(`[imageCallback] Image processing failed for ${product_id}: ${error}`)

            res.status(200).json({
                message: 'Failure recorded',
                product_id,
                error,
                target_status: target_status
            })
        } else {
            res.status(400).json({ message: 'Invalid processing_status. Must be "success", "failed", or "partial"' })
        }
    } catch (err: any) {
        logger.error(`[imageCallback] Error processing callback for ${product_id}:`, err)
        res.status(500).json({ message: 'Internal server error' })
    }
}
