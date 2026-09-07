import Sharp from "sharp"
import crypto from "crypto"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { uploadToS3WithPath, extractRelativePath } from "../../../shared/utils/common"

/**
 * Image dimension configuration
 */
export interface ImageDimension {
    name: string
    width: number
    height: number
    fit: "contain" | "cover" | "fill" | "inside" | "outside"
}

/**
 * Default image dimensions for product images
 */
export const DEFAULT_IMAGE_DIMENSIONS: ImageDimension[] = [
    { name: "thumbnail", width: 80, height: 107, fit: "contain" },
    { name: "small", width: 160, height: 213, fit: "contain" },
    { name: "medium", width: 256, height: 341, fit: "contain" },
    { name: "large", width: 512, height: 683, fit: "contain" },
    { name: "xlarge", width: 800, height: 1067, fit: "contain" },
    { name: "xxlarge", width: 960, height: 1280, fit: "contain" },
]

/**
 * Download image from URL with retry logic
 */
export async function downloadImageWithRetry(
    url: string,
    maxAttempts: number = 3,
    delayMs: number = 500
): Promise<Buffer> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(30000),
            })

            if (!response.ok) {
                throw new MedusaError(MedusaError.Types.INVALID_DATA, `HTTP ${response.status}: ${response.statusText}`)
            }

            return Buffer.from(await response.arrayBuffer())
        } catch (error) {
            lastError = error as Error

            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, delayMs))
            }
        }
    }

    throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to download image after ${maxAttempts} attempts: ${lastError?.message}`
    )
}

/**
 * Process image to WebP format with specified dimensions
 */
export async function processImageToWebP(
    buffer: Buffer,
    dimension: ImageDimension,
    quality: number = 85
): Promise<Buffer> {
    return Sharp(buffer)
        .resize({
            width: dimension.width,
            height: dimension.height,
            fit: dimension.fit,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
            kernel: Sharp.kernel.lanczos3,
        })
        .toFormat("webp", { quality, effort: 2 })
        .toBuffer()
}

/**
 * Upload file to S3 via direct S3 SDK (preserves folder structure)
 */
export async function uploadToS3(
    filename: string,
    buffer: Buffer,
    logger?: any
): Promise<string> {
    const fullUrl = await uploadToS3WithPath(filename, buffer, "image/webp")
    const relativePath = extractRelativePath(fullUrl)

    if (logger) {
        const bucket = process.env.S3_BUCKET || 'unknown'
        logger.info(
            `[S3 Upload] ✓ Uploaded to bucket: ${bucket}\n` +
            `  Path: ${relativePath}\n` +
            `  Size: ${(buffer.length / 1024).toFixed(2)} KB\n` +
            `  Full URL: ${fullUrl}`
        )
    }

    return relativePath
}

/**
 * Strip S3 domain from URL for CDN flexibility
 */
export function stripS3Domain(url: string, s3Domain: string): string {
    return url.replace(s3Domain, "").replace(/^\/+/, "")
}

/**
 * Generate image record for database insertion
 */
export function createImageRecord(
    productId: string,
    url: string,
    rank: number,
    dimension: ImageDimension,
    fileSize: number,
    originalDimensions: { width: number; height: number }
) {
    return {
        id: `img_${crypto.randomUUID().replace(/-/g, "").substring(0, 26)}`,
        product_id: productId,
        url,
        rank,
        metadata: {
            dimensions: `${dimension.width}x${dimension.height}`,
            sizeName: dimension.name,
            format: "webp",
            fileSize,
            originalDimensions: `${originalDimensions.width}x${originalDimensions.height}`,
        },
        created_at: new Date(),
        updated_at: new Date(),
    }
}
