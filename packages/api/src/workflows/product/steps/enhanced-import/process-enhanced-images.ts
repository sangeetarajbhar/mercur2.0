import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import Sharp from "sharp"
import crypto from "crypto"
import {
    downloadImageWithRetry,
    uploadToS3,
    stripS3Domain,
} from "../../utils/image-processing"

export const processEnhancedImagesStepId = "process-enhanced-images"

export interface ProcessEnhancedImagesInput {
    products: Array<{
        handle: string
        images?: string[] // Array of image URLs from CSV (Product Image 1, 2, 3...)
    }>
    transactionId: string
}

export interface ProcessEnhancedImagesResult {
    productThumbnails: Record<string, string> // productHandle -> thumbnail URL
}

/**
 * Step to process original product images to WebP format
 * Runs BEFORE product creation/update
 * Uploads original-resolution WebP to S3 for use as product.thumbnail
 */
export const processEnhancedImagesStep = createStep(
    processEnhancedImagesStepId,
    async (input: ProcessEnhancedImagesInput, { container }) => {
        const logger = container.resolve("logger")
        const fileModule = container.resolve(Modules.FILE)

        logger.info(`[Enhanced Import] Starting thumbnail processing for ${input.products.length} products`)

        const S3_DOMAIN = process.env.S3_FILE_URL || ""
        const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || "85")
        const CONCURRENCY = parseInt(process.env.IMAGE_PROCESSING_CONCURRENCY || "5")
        const productThumbnails: Record<string, string> = {}

        // Helper function to process a single product
        const processProduct = async (product: typeof input.products[0]): Promise<void> => {
            // Skip products without images
            if (!product.images?.length) {
                logger.debug(`[Enhanced Import] Skipping ${product.handle} - no images`)
                return
            }

            try {
                // Use first image as thumbnail
                const firstImageUrl = product.images[0]

                // Download original image
                const originalBuffer = await downloadImageWithRetry(firstImageUrl)

                // Validate image
                const metadata = await Sharp(originalBuffer).metadata()

                if (!metadata.width || !metadata.height) {
                    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid image: no dimensions")
                }

                if (metadata.width < 300 || metadata.height < 300) {
                    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Image too small: minimum 300x300 pixels required")
                }

                // Convert to WebP (keep original resolution)
                const webpBuffer = await Sharp(originalBuffer)
                    .toFormat("webp", {
                        quality: IMAGE_QUALITY,
                        effort: 4, // Higher effort for better quality on original
                    })
                    .toBuffer()

                // Check file size (max 5MB)
                if (webpBuffer.length > 5 * 1024 * 1024) {
                    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Image too large: maximum 5MB after compression")
                }

                // Upload to S3
                const filename = `images/product/${product.handle}/original/${crypto.randomUUID()}.webp`
                const uploadedUrl = await uploadToS3(filename, webpBuffer, logger)

                // Strip S3 domain for CDN flexibility
                const cdnFlexibleUrl = stripS3Domain(uploadedUrl, S3_DOMAIN)

                productThumbnails[product.handle] = cdnFlexibleUrl

                logger.info(
                    `[Enhanced Import] Processed thumbnail for ${product.handle}: ${cdnFlexibleUrl}`
                )
            } catch (error) {
                logger.error(
                    `[Enhanced Import] Failed to process thumbnail for product ${product.handle}:`,
                    error
                )
                // Continue with other products - this product will have no thumbnail
            }
        }

        // Process images in parallel batches with concurrency limit
        const productsToProcess = input.products.filter(p => p.images?.length)

        if (productsToProcess.length === 0) {
            logger.info('[Enhanced Import] No products with images to process')
            return new StepResponse({ productThumbnails })
        }

        logger.info(`[Enhanced Import] Processing ${productsToProcess.length} images with concurrency ${CONCURRENCY}`)

        // Split into batches for parallel processing
        for (let i = 0; i < productsToProcess.length; i += CONCURRENCY) {
            const batch = productsToProcess.slice(i, i + CONCURRENCY)
            await Promise.all(batch.map(product => processProduct(product)))

            logger.debug(`[Enhanced Import] Processed batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(productsToProcess.length / CONCURRENCY)}`)
        }

        logger.info(`[Enhanced Import] Completed: ${Object.keys(productThumbnails).length}/${productsToProcess.length} successful`)

        return new StepResponse({ productThumbnails })
    }
)
