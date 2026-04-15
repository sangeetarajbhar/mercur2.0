import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import type { Logger } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'

export const validateImageUrlsStepId = 'validate-image-urls'

interface Product {
    handle: string
    images?: string[]
}

interface ImageUrlValidationInput {
    products: Product[]
}

interface ImageUrlValidationResult {
    valid: boolean
    failedUrls: Array<{
        url: string
        error: string
        productHandle: string
    }>
}

/**
 * Validates that all product image URLs are reachable
 * Uses HEAD requests with 5-second timeout for fast validation
 */
export const validateImageUrlsStep = createStep(
    validateImageUrlsStepId,
    async (input: ImageUrlValidationInput, { container }) => {
        const logger = container.resolve<Logger>('logger')

        logger.info(`[validateImageUrls] Starting validation for ${input.products.length} products`)

        // Collect all URLs with their associated product handles
        const urlsToValidate: Array<{ url: string; productHandle: string }> = []

        for (const product of input.products) {
            if (!product.images || product.images.length === 0) {
                continue
            }

            for (const url of product.images) {
                urlsToValidate.push({
                    url,
                    productHandle: product.handle
                })
            }
        }

        if (urlsToValidate.length === 0) {
            logger.info('[validateImageUrls] No images to validate')
            return new StepResponse<ImageUrlValidationResult>({
                valid: true,
                failedUrls: []
            })
        }

        logger.info(`[validateImageUrls] Validating ${urlsToValidate.length} image URLs`)

        // Validate all URLs in parallel with Promise.allSettled
        const validationResults = await Promise.allSettled(
            urlsToValidate.map(({ url, productHandle }) =>
                validateSingleUrl(url, productHandle, logger)
            )
        )

        // Collect failed validations
        const failedUrls = validationResults
            .map((result, index) => {
                if (result.status === 'fulfilled' && result.value.valid) {
                    return null
                }

                const error = result.status === 'rejected'
                    ? result.reason.message
                    : result.value.error

                return {
                    url: urlsToValidate[index].url,
                    productHandle: urlsToValidate[index].productHandle,
                    error
                }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)

        const allValid = failedUrls.length === 0

        if (!allValid) {
            logger.warn(
                `[validateImageUrls] ${failedUrls.length} URLs failed validation:` +
                failedUrls.map(f => `${f.productHandle}: ${f.url} - ${f.error}`)
            )
            throw new MedusaError(MedusaError.Types.INVALID_DATA, `[validateImageUrls] ${failedUrls.length} URLs failed validation`)
        } else {
            logger.info(`[validateImageUrls] All ${urlsToValidate.length} URLs validated successfully`)
        }

        return new StepResponse<ImageUrlValidationResult>({
            valid: allValid,
            failedUrls
        })
    }
)

/**
 * Validates a single URL using HEAD request with timeout
 */
async function validateSingleUrl(
    url: string,
    productHandle: string,
    logger: Logger
): Promise<{ valid: boolean; error?: string }> {
    try {
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            return {
                valid: false,
                error: `HTTP ${response.status}: ${response.statusText}`
            }
        }

        return { valid: true }

    } catch (error) {
        // Handle timeout
        if (error.name === 'AbortError') {
            return {
                valid: false,
                error: 'Request timeout after 5 seconds'
            }
        }

        // Handle network errors
        return {
            valid: false,
            error: error.message || 'Network error'
        }
    }
}
