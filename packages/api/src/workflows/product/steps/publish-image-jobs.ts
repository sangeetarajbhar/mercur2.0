import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import type { Logger } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import axios from 'axios'
import axiosRetry from 'axios-retry'

export const publishImageJobsStepId = 'publish-image-jobs'

interface Product {
    id: string
    _target_status?: string
    _pending_images?: string[]
}

interface PublishImageJobsInput {
    products: Product[]
}

interface PublishImageJobsResult {
    publishedCount: number
    failed: string[]
    invalidUrls: Array<{
        productId: string
        url: string
        error: string
    }>
}

/**
 * Publishes image processing jobs to SQS for products with pending images
 * Following the serverless architecture pattern
 */
export const publishImageJobsStep = createStep(
    publishImageJobsStepId,
    async (input: PublishImageJobsInput, { container }) => {
        const logger = container.resolve<Logger>('logger')

        const queueUrl = process.env.IMAGE_PROCESSING_QUEUE_URL

        if (!queueUrl) {
            logger.error('[publishImageJobs] IMAGE_PROCESSING_QUEUE_URL not configured, skipping SQS publishing')
            throw new MedusaError(MedusaError.Types.INVALID_DATA, 'IMAGE_PROCESSING_QUEUE_URL not configured')
        }

        logger.info(`[publishImageJobs] Publishing jobs for ${input.products.length} products`)

        // First, validate all image URLs before processing any jobs
        logger.info('[publishImageJobs] Validating all image URLs before processing')
        const allUrlsToValidate: Array<{ url: string; productId: string }> = []

        for (const product of input.products) {
            if (product._pending_images && product._pending_images.length > 0) {
                for (const url of product._pending_images) {
                    allUrlsToValidate.push({ url, productId: product.id })
                }
            }
        }

        if (allUrlsToValidate.length > 0) {
            logger.info(`[publishImageJobs] Validating ${allUrlsToValidate.length} URLs`)
            const invalidUrls = await validateImageUrls(allUrlsToValidate, logger)

            if (invalidUrls.length > 0) {
                logger.error(`[publishImageJobs] ${invalidUrls.length} URLs failed validation`)
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    `[publishImageJobs] ${invalidUrls.length} image URLs failed validation: ${invalidUrls.map(u => `${u.productId}:${u.url} - ${u.error}`).join(', ')}`
                )
            }
        }

        // All URLs are valid, proceed with SQS publishing
        const sqsClient = new SQSClient({
            region: process.env.AWS_REGION
        })

        let successCount = 0
        const failed: string[] = []

        for (const product of input.products) {
            // Skip products without pending images
            if (!product._pending_images || product._pending_images.length === 0) {
                logger.debug(`[publishImageJobs] Skipping ${product.id} - no pending images`)
                continue
            }

            try {
                const message = {
                    event: 'image.processing_requested',
                    payload: {
                        product_id: product.id,
                        image_urls: product._pending_images,
                        target_status: product._target_status
                    }
                }
                console.log(`[publishImageJobs] Publishing job for ${product.id}:`, message)

                const command = new SendMessageCommand({
                    QueueUrl: queueUrl,
                    MessageBody: JSON.stringify(message)
                })

                await sqsClient.send(command)

                successCount++
                logger.info(`[publishImageJobs] Published job for ${product.id}`)
            } catch (error: any) {
                logger.error(`[publishImageJobs] Failed to publish job for ${product.id}:`, error.message)
                failed.push(product.id)
            }
        }

        logger.info(`[publishImageJobs] Successfully published ${successCount} jobs, ${failed.length} failed`)

        return new StepResponse<PublishImageJobsResult>({
            publishedCount: successCount,
            failed,
            invalidUrls: [] // Will be empty since we validate upfront and throw error
        })
    }
)

/**
 * Validates image URLs using HEAD requests with enhanced headers for CDN compatibility
 */
async function validateImageUrls(
    urlsToValidate: Array<{ url: string; productId: string }>,
    logger: Logger
): Promise<Array<{ productId: string; url: string; error: string }>> {
    const invalidUrls: Array<{ productId: string; url: string; error: string }> = []

    // Create axios instance with retry configuration
    const axiosInstance = axios.create()
    axiosRetry(axiosInstance, {
        retries: 2, // Fewer retries for validation
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error: any) => {
            // Only retry on network errors and 5xx errors, not 4xx
            return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                (error.response?.status != null && error.response.status >= 500)
        },
        onRetry: (retryCount, error, requestConfig) => {
            logger.debug(`[validateImageUrls] Retry ${retryCount} for ${requestConfig.url}: ${error.message}`)
        }
    })

    // Validate URLs in parallel with limit to avoid overwhelming servers
    const batchSize = 10
    const batches: Array<Array<{ url: string; productId: string }>> = []
    for (let i = 0; i < urlsToValidate.length; i += batchSize) {
        batches.push(urlsToValidate.slice(i, i + batchSize))
    }

    for (const batch of batches) {
        const validationPromises = batch.map(async ({ url, productId }) => {
            try {
                logger.debug(`[validateImageUrls] Validating ${url}`)

                const response = await axiosInstance.head(url, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'ZiloImageProcessor/2.0',
                        'Accept': 'image/*',
                        'Accept-Encoding': 'gzip, deflate, br',
                    },
                    maxRedirects: 2
                })

                if (response.status === 200) {
                    const contentType = response.headers['content-type']
                    if (contentType && typeof contentType === 'string'&& !contentType.startsWith('image/')) {
                        return {
                            productId,
                            url,
                            error: `Not an image: content-type is ${contentType}`
                        }
                    }
                    return null // Valid URL
                } else {
                    return {
                        productId,
                        url,
                        error: `HTTP ${response.status}: ${response.statusText}`
                    }
                }

            } catch (error: any) {
                let errorMessage = error.message
                if (error.code === 'ECONNABORTED') {
                    errorMessage = 'Request timeout after 5 seconds'
                } else if (error.code === 'ENOTFOUND') {
                    errorMessage = 'Domain not found'
                } else if (error.code === 'ECONNREFUSED') {
                    errorMessage = 'Connection refused'
                } else if (error.response?.status != null && error.response.status === 403) {
                    errorMessage = `Access forbidden (403) - CDN may require authentication`
                }

                return {
                    productId,
                    url,
                    error: errorMessage
                }
            }
        })

        const batchResults = await Promise.all(validationPromises)
        invalidUrls.push(...batchResults.filter(result => result !== null) as Array<{ productId: string; url: string; error: string }>)
    }

    return invalidUrls
}
