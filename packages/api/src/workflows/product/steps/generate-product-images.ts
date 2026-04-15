import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import Sharp from "sharp"
import {
    DEFAULT_IMAGE_DIMENSIONS,
    downloadImageWithRetry,
    processImageToWebP,
    uploadToS3,
    createImageRecord,
} from "../utils/image-processing"

export const generateProductImagesStepId = "generate-product-images-step"

export interface GenerateProductImagesInput {
    products: Array<{ id: string; thumbnail?: string }>
    transactionId?: string
}

export interface GenerateProductImagesOutput {
    createdImageIds: string[]
    failed: Array<{ productId: string; error: string }>
}

export const generateProductImagesStep = createStep(
    generateProductImagesStepId,
    // 1. Step Handler
    async (input: GenerateProductImagesInput, { container }) => {
        const logger = container.resolve("logger")
        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

        const S3_DOMAIN = process.env.S3_FILE_URL || ""
        const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || "85")
        const CONCURRENCY_LIMIT = 5

        const createdImageIds: string[] = []
        const failed: Array<{ productId: string; error: string }> = []

        logger.info(`[generateProductImages] Starting multi-resolution generation for ${input.products.length} products`)

        const productsToProcess = await filterProductsWithExistingImages(input.products, knex, logger)

        if (productsToProcess.length === 0) {
            return new StepResponse({ createdImageIds, failed }, createdImageIds)
        }

        // Process in chunks to limit concurrency
        for (let i = 0; i < productsToProcess.length; i += CONCURRENCY_LIMIT) {
            const chunk = productsToProcess.slice(i, i + CONCURRENCY_LIMIT)

            await Promise.all(chunk.map(async (product) => {
                try {
                    const ids = await processSingleProduct(product, S3_DOMAIN, IMAGE_QUALITY, knex, logger)
                    createdImageIds.push(...ids)
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error"
                    logger.error(`[generateProductImages] Failed for ${product.id}:`, error)
                    failed.push({ productId: product.id, error: errorMessage })
                }
            }))
        }

        return new StepResponse({ createdImageIds, failed }, createdImageIds)
    },

    // 2. Compensation Function
    async (compensationData, { container }) => {
        if (!compensationData?.length) return

        const logger = container.resolve("logger")
        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
        const fileModule = container.resolve(Modules.FILE)

        await rollbackImages(compensationData, knex, fileModule, logger)
    }
)

// =========================================================================
// Helper Functions (SRP)
// =========================================================================

async function filterProductsWithExistingImages(products: any[], knex: any, logger: any) {
    const productIds = products.filter(p => p.thumbnail).map(p => p.id)

    if (productIds.length === 0) {
        logger.info('[generateProductImages] No products with thumbnails to process')
        return []
    }

    const existingImagesRows = await knex("image")
        .whereIn("product_id", productIds)
        .whereNotNull("metadata")
        .select("product_id")
        .distinct()

    const existingIds = new Set(existingImagesRows.map((row: any) => row.product_id))

    logger.info(
        `[generateProductImages] Found ${existingIds.size} products with existing images, ` +
        `will process ${productIds.length - existingIds.size} products`
    )

    return products.filter(p => p.thumbnail && !existingIds.has(p.id))
}

async function processSingleProduct(
    product: any,
    s3Domain: string,
    quality: number,
    knex: any,
    logger: any
): Promise<string[]> {
    const originalUrl = product.thumbnail.startsWith("http")
        ? product.thumbnail
        : `${s3Domain}/${product.thumbnail}`

    const originalBuffer = await downloadImageWithRetry(originalUrl)
    const metadata = await Sharp(originalBuffer).metadata()

    const originalDimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0,
    }

    const imageRecords: any[] = []

    for (const [index, dim] of DEFAULT_IMAGE_DIMENSIONS.entries()) {
        const resized = await processImageToWebP(originalBuffer, dim, quality)
        const filename = `images/product/${product.id}/${dim.width}x${dim.height}/${crypto.randomUUID()}.webp`

        await uploadToS3(filename, resized, logger)

        imageRecords.push(
            createImageRecord(
                product.id,
                filename,
                index,
                dim,
                resized.length,
                originalDimensions
            )
        )
    }

    await knex("image").insert(imageRecords)

    logger.info(`[generateProductImages] Generated ${imageRecords.length} images for ${product.id}`)

    return imageRecords.map(r => r.id)
}

async function rollbackImages(ids: string[], knex: any, fileModule: any, logger: any) {
    const imageRecords = await knex("image")
        .whereIn("id", ids)
        .select("url")

    if (imageRecords.length > 0) {
        await fileModule.deleteFiles(imageRecords.map((img: any) => img.url))
    }

    await knex("image").whereIn("id", ids).del()

    logger.info(`[generateProductImages] Rolled back ${ids.length} images (DB + S3)`)
}
