/**
 * Memory-Optimized Streaming Image Processor
 * 
 * This processor uses streams instead of buffers to handle large images
 * and implements aggressive memory management to prevent heap overflow.
 */

import sharp from 'sharp'
import { PassThrough, Readable } from 'stream'
import * as https from 'https'
import * as http from 'http'
import { URL } from 'url'
import { batchUploadToS3Stream } from './common'
import { getImportConfig } from '../../api/vendor/products/config/import.config'
import Redis from 'ioredis'

// Custom error interface with code property
interface CustomError extends Error {
  code?: string
}

export interface StreamingImageSize {
  width: number
  height: number
  suffix: string
  quality?: number
}

export interface StreamingResizedImage {
  url: string
  width: number
  height: number
  size: string
  fileSize: number
}

export interface StreamingImageResult {
  success: boolean
  images: StreamingResizedImage[]
  error?: string
  processingTime: number
  memoryUsed: number
}

/**
 * Complete image sizes for streaming processing - ULTRA FAST MODE for <1s batches
 */
export const STREAMING_IMAGE_SIZES: StreamingImageSize[] = [
  { width: 80, height: 107, suffix: '80x107', quality: 100 },   // Lower quality for speed
  // { width: 160, height: 213, suffix: '160x213', quality: 50 },
  { width: 256, height: 341, suffix: '256x341', quality: 100 },
  // { width: 512, height: 683, suffix: '512x683', quality: 55 },
  { width: 800, height: 1067, suffix: '800x1067', quality: 100 },
  { width: 960, height: 1280, suffix: '960x1280', quality: 100 },
  { width: 0, height: 0, suffix: 'original', quality: 100 } // Original size with lower quality
]

/**
 * Semaphore for controlling concurrent image processing
 */
class ProcessingSemaphore {
  private permits: number
  private waiting: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--
        resolve()
      } else {
        this.waiting.push(() => {
          this.permits--
          resolve()
        })
      }
    })
  }

  release(): void {
    this.permits++
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!
      next()
    }
  }
}

// Global semaphore to control memory usage - EXTREME MODE for 10-15min target
const processingLimiter = new ProcessingSemaphore(20) // Max 20 concurrent image processing operations

// Circuit breaker for failed image URLs
const failedUrls = new Set<string>()
const MAX_FAILED_ATTEMPTS = 4 // 4 retry attempts as requested

// Redis Cache Configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'zilo:image:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
}

// Redis Image Cache Class
class RedisImageCache {
  private redis: Redis
  private connected: boolean = false
  private readonly TTL = 7 * 24 * 60 * 60 // 7 days in seconds
  
  constructor() {
    this.redis = new Redis(REDIS_CONFIG)
    this.setupEventHandlers()
  }
  
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.connected = true
    })
    
    this.redis.on('error', (error) => {
      this.connected = false
      console.warn('[REDIS] Redis connection error:', error.message)
    })
    
    this.redis.on('close', () => {
      this.connected = false
    })
  }
  
  async get(url: string): Promise<StreamingResizedImage[] | null> {
    if (!this.connected) return null
    
    try {
      const cached = await this.redis.get(this.getKey(url))
      if (cached) {
        return JSON.parse(cached) as StreamingResizedImage[]
      }
      return null
    } catch (error) {
      console.warn('[REDIS] Cache get error:', error.message)
      return null
    }
  }
  
  async set(url: string, images: StreamingResizedImage[]): Promise<void> {
    if (!this.connected) return
    
    try {
      await this.redis.setex(
        this.getKey(url),
        this.TTL,
        JSON.stringify(images)
      )
    } catch (error) {
      console.warn('[REDIS] Cache set error:', error.message)
    }
  }
  
  async has(url: string): Promise<boolean> {
    if (!this.connected) return false
    
    try {
      const exists = await this.redis.exists(this.getKey(url))
      return exists === 1
    } catch (error) {
      console.warn('[REDIS] Cache exists error:', error.message)
      return false
    }
  }
  
  async clear(pattern?: string): Promise<number> {
    if (!this.connected) return 0
    
    try {
      const searchPattern = pattern ? `${this.getKey(pattern)}*` : `${REDIS_CONFIG.keyPrefix}*`
      const keys = await this.redis.keys(searchPattern)
      if (keys.length > 0) {
        return await this.redis.del(...keys)
      }
      return 0
    } catch (error) {
      console.warn('[REDIS] Cache clear error:', error.message)
      return 0
    }
  }
  
  async size(): Promise<number> {
    if (!this.connected) return 0
    
    try {
      const keys = await this.redis.keys(`${REDIS_CONFIG.keyPrefix}*`)
      return keys.length
    } catch (error) {
      console.warn('[REDIS] Cache size error:', error.message)
      return 0
    }
  }
  
  async getStats(): Promise<{ size: number, connected: boolean, memory?: string }> {
    const size = await this.size()
    let memory: string | undefined
    
    if (this.connected) {
      try {
        // Get Redis memory info (simplified approach)
        const info = await this.redis.info('memory')
        const match = info.match(/used_memory:(\d+)/)
        const memoryBytes = match ? parseInt(match[1]) : 0
        memory = `${Math.round(memoryBytes / 1024 / 1024)}MB`
      } catch (error) {
        // Memory command might not be available in all Redis versions
      }
    }
    
    return { size, connected: this.connected, memory }
  }
  
  private getKey(url: string): string {
    // Create a hash of the URL for consistent key naming
    return Buffer.from(url).toString('base64').substring(0, 50)
  }
  
  async disconnect(): Promise<void> {
    await this.redis.quit()
  }
}

// Global Redis image cache instance
const redisImageCache = new RedisImageCache()

/**
 * Download image as stream using Node.js HTTP client with fetch fallback
 */
async function downloadImageStream(imageUrl: string, retryCount: number = 0, useFetch: boolean = false): Promise<{
  stream: Readable
  contentLength?: number
  contentType?: string
}> {
  const config = getImportConfig()
  const maxSize = config.imageProcessing.maxImageSize
  const maxRetries = config.imageProcessing.maxRetries
  const timeout = config.imageProcessing.timeout

  // Try fetch first if requested, otherwise use native HTTP client
  if (useFetch) {
    return downloadWithFetch(imageUrl, timeout, maxSize)
  }

  return new Promise<{
    stream: Readable
    contentLength?: number
    contentType?: string
  }>((resolve, reject) => {
    try {
      // Downloading with HTTP client

      const url = new URL(imageUrl)
      const isHttps = url.protocol === 'https:'
      const client = isHttps ? https : http

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Medusa-Product-Import/2.0',
          'Accept': 'image/*',
          'Accept-Encoding': 'identity', // Disable compression for streaming
          'Cache-Control': 'no-cache',
          'Connection': 'close' // Prevent connection reuse issues
        },
        // Remove timeout to let connection complete naturally
        // timeout: Math.min(timeout, 20000), // Removed - let it complete naturally
        // Additional options for better reliability
        keepAlive: false,
        maxSockets: 1
      }

      const request = client.request(options, (response) => {
        const { statusCode, headers } = response
        
        if (!statusCode || statusCode < 200 || statusCode >= 300) {
          const error = new Error(`HTTP ${statusCode}: ${response.statusMessage}`) as CustomError
          error.code = `HTTP_${statusCode}`
          return reject(error)
        }

        const contentType = headers['content-type']
        const contentLength = headers['content-length']
        
        if (contentLength && parseInt(contentLength) > maxSize) {
          const error = new Error(`Image too large: ${contentLength} bytes (max: ${maxSize})`) as CustomError
          error.code = 'FILE_TOO_LARGE'
          return reject(error)
        }

        if (!contentType || !contentType.startsWith('image/')) {
          const error = new Error(`Invalid content type: ${contentType}`) as CustomError
          error.code = 'INVALID_CONTENT_TYPE'
          return reject(error)
        }

        
        // Return the response stream directly
        resolve({
          stream: response,
          contentLength: contentLength ? parseInt(contentLength) : undefined,
          contentType
        })
      })

      // Error handling
      request.on('error', (error) => {
        console.error(`[STREAM] Request error for ${imageUrl}:`, error.message)
        reject(error)
      })

      // Removed timeout handler - let connection complete naturally
      // request.on('timeout', () => {
      //   request.destroy()
      //   const error = new Error(`Request timeout after ${timeout}ms`) as CustomError
      //   error.code = 'REQUEST_TIMEOUT'
      //   reject(error)
      // })

      // Send the request
      request.end()

    } catch (error) {
      reject(error)
    }
  }).catch(async (error) => {
    console.error(`[STREAM] Download attempt ${retryCount + 1} failed for ${imageUrl}:`, {
      message: error.message,
      code: error.code,
      name: error.name
    })

    // Retry logic for network errors
    if (retryCount < maxRetries) {
      const isRetryableError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'REQUEST_TIMEOUT' ||
        error.code === 'EPIPE' ||
        error.name === 'TypeError' ||
        error.message.includes('timeout') ||
        error.message.includes('connect') ||
        (error.code && error.code.startsWith('HTTP_5')) // 5xx server errors

      if (isRetryableError) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 15000) // Exponential backoff, max 15s
        
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Try fetch as fallback if HTTP client keeps failing
        const shouldTryFetch = retryCount >= Math.floor(maxRetries / 2) && !useFetch
        return downloadImageStream(imageUrl, retryCount + 1, shouldTryFetch)
      }
    }

    throw error
  })
}

/**
 * Fallback download using fetch API
 */
async function downloadWithFetch(imageUrl: string, timeout: number, maxSize: number): Promise<{
  stream: Readable
  contentLength?: number
  contentType?: string
}> {
  // Downloading with fetch fallback

  const controller = new AbortController()
  // Remove artificial timeout - let fetch complete naturally
  // const fetchTimeout = Math.min(timeout, 15000)
  // const timeoutId = setTimeout(() => {

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProcessor/1.0)',
        'Accept': 'image/*'
      }
    })

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as CustomError
      error.code = `HTTP_${response.status}`
      throw error
    }

    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      const error = new Error(`Image too large: ${contentLength} bytes (max: ${maxSize})`) as CustomError
      error.code = 'FILE_TOO_LARGE'
      throw error
    }

    if (!contentType || !contentType.startsWith('image/')) {
      const error = new Error(`Invalid content type: ${contentType}`) as CustomError
      error.code = 'INVALID_CONTENT_TYPE'
      throw error
    }

    // Create a readable stream from the response
    const stream = Readable.fromWeb(response.body as any)
    
    return {
      stream,
      contentLength: contentLength ? parseInt(contentLength) : undefined,
      contentType
    }

  } catch (error) {
    throw error
  }
}

/**
 * Process single image with streaming and memory management
 */
export async function processImageStreamOptimized(
  imageUrl: string,
  productId: string,
  productName: string,
  sizes: StreamingImageSize[] = STREAMING_IMAGE_SIZES
): Promise<StreamingImageResult> {
  const startTime = Date.now()
  const startMemory = process.memoryUsage().heapUsed

  // Check Redis cache first - MAJOR OPTIMIZATION
  const cachedImages = await redisImageCache.get(imageUrl)
  if (cachedImages) {
    // Cache hit - skipping processing
    return {
      success: true,
      images: cachedImages,
      processingTime: Date.now() - startTime,
      memoryUsed: 0 // No memory used for cached results
    }
  }

  // Check circuit breaker
  if (failedUrls.has(imageUrl)) {
    // Skipping previously failed image
    return {
      success: false,
      error: 'Image previously failed multiple times',
      images: [],
      processingTime: 0,
      memoryUsed: 0
    }
  }

  await processingLimiter.acquire()

  try {
    // Quick URL validation
    try {
      new URL(imageUrl)
    } catch (urlError) {
      throw new Error(`Invalid URL format: ${imageUrl}`)
    }

    // Download image with 4-retry logic
    let downloadResult
    let retryCount = 0
    const maxRetries = 4
    
    while (retryCount < maxRetries) {
      try {
        // Alternate between fetch and HTTP client
        const useFetch = retryCount % 2 === 0
        downloadResult = await downloadImageStream(imageUrl, retryCount, useFetch)
        break // Success, exit retry loop
        
      } catch (error: any) {
        retryCount++
        if (retryCount >= maxRetries) {
          // All retries failed - add to circuit breaker
          failedUrls.add(imageUrl)
          throw error
        }
        
        // Short delay before retry
        await new Promise(resolve => setTimeout(resolve, 200 * retryCount))
      }
    }

    const { stream: imageStream } = downloadResult

    // Generate unique filename
    const uuid = generateUUID()
    const sanitizedName = productName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const baseFilename = `${uuid}_${sanitizedName}`

    const processedImages: StreamingResizedImage[] = []
    const uploadStreams: Array<{
      filename: string
      stream: PassThrough
      mimeType: string
    }> = []

    // Create base Sharp instance from download stream
    const baseSharp = sharp().on('error', (err) => {
      console.error('[SHARP] Base Sharp error:', err.message)
    })
    
    // Pipe download stream to base Sharp
    imageStream.pipe(baseSharp)

    // Create variants from cloned Sharp instances
    const variantPromises = sizes.map(async (size, index) => {
      try {
        const transform = baseSharp.clone()
        const outputStream = new PassThrough()
        
        const filePath = size.suffix === 'original'
          ? `images/product/${productId}/${baseFilename}.webp`
          : `images/product/${productId}/${size.suffix}/${baseFilename}.webp`
        
        // Configure transformation
        if (size.suffix === 'original') {
          transform.webp({
            quality: size.quality || 60,
            effort: 0,
            nearLossless: false,
            smartSubsample: false,
            preset: 'default'
          })
        } else {
          transform
            .resize({
              width: size.width || undefined,
              height: size.height || undefined,
              fit: 'inside',
              kernel: sharp.kernel.nearest,
              fastShrinkOnLoad: true,
              withoutEnlargement: true,
              withoutReduction: false
            })
            .webp({
              quality: size.quality || 60,
              effort: 0,
              nearLossless: false,
              smartSubsample: false,
              preset: 'default'
            })
        }
        
        // Pipe transform to output stream
        transform.pipe(outputStream)
        
        uploadStreams.push({
          filename: filePath,
          stream: outputStream,
          mimeType: 'image/webp'
        })
        
        return { size, index }
      } catch (error) {
        console.error(`[SHARP] Error creating variant ${size.suffix}:`, error.message)
        return null
      }
    })

    // Wait for all variants to be set up
    await Promise.all(variantPromises)

    // Upload all processed images in batch
    const uploadUrls = await batchUploadToS3Stream(uploadStreams)

    // Map results
    uploadUrls.forEach((url, index) => {
      const size = sizes[index]
      if (url && size) {
        processedImages.push({
          url,
          width: size.width,
          height: size.height,
          size: size.suffix,
          fileSize: 0 // Will be calculated by S3
        })
      }
    })

    const processingTime = Date.now() - startTime
    const memoryUsed = process.memoryUsage().heapUsed - startMemory

    // Cache the processed images in Redis for future use - MAJOR OPTIMIZATION
    await redisImageCache.set(imageUrl, processedImages)
    // Cached processed images in Redis

    return {
      success: true,
      images: processedImages,
      processingTime,
      memoryUsed
    }

  } catch (error) {
    const errorMessage = error.message || 'Unknown error'
    const errorCode = error.code || 'UNKNOWN_ERROR'
    
    console.error(`[STREAM] Failed to process image ${imageUrl}:`, {
      message: errorMessage,
      code: errorCode,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
    })
    
    return {
      success: false,
      images: [],
      error: `${errorCode}: ${errorMessage}`,
      processingTime: Date.now() - startTime,
      memoryUsed: process.memoryUsage().heapUsed - startMemory
    }
  } finally {
    processingLimiter.release()
    
    // Force garbage collection
    if (global.gc) {
      global.gc()
    }
  }
}

/**
 * Process multiple images for a product with memory management
 */
export async function processProductImagesStream(
  productId: string,
  productName: string,
  imageUrls: string[]
): Promise<{
  success: boolean
  processedImages: StreamingResizedImage[]
  errors: string[]
  totalProcessingTime: number
  totalMemoryUsed: number
}> {
  const startTime = Date.now()
  const startMemory = process.memoryUsage().heapUsed
  
  const processedImages: StreamingResizedImage[] = []
  const errors: string[] = []

  
  // Set up heartbeat logging to track progress
  const heartbeatInterval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    // Heartbeat logging disabled
  }, 30000) // Log every 30 seconds

  // Process images in parallel batches
  const BATCH_SIZE = 10 // Process 10 images concurrently per product
  
  for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
    const batch = imageUrls.slice(i, i + BATCH_SIZE)
    const batchStartTime = Date.now()
    
    
    // Process batch in parallel
    const batchPromises = batch.map(async (imageUrl, batchIndex) => {
      const globalIndex = i + batchIndex
      
      try {
        const result = await Promise.race([
          processImageStreamOptimized(imageUrl, productId, productName),
          new Promise<StreamingImageResult>((_, reject) => 
            setTimeout(() => {
              reject(new Error('Image processing timeout after 10 seconds'))
            }, 10000) // 10 second timeout per image
          )
        ])
        
        return { success: true, result, index: globalIndex }
      } catch (error: any) {
        return { success: false, error: error.message, index: globalIndex }
      }
    })
    
    // Wait for batch completion
    const batchResults = await Promise.allSettled(batchPromises)
    const batchProcessingTime = Date.now() - batchStartTime
    
    
    // Process results
    batchResults.forEach((promiseResult, batchIndex) => {
      if (promiseResult.status === 'fulfilled') {
        const { success, result, error, index } = promiseResult.value
        if (success && result?.success) {
          processedImages.push(...result.images)
        } else {
          errors.push(`Image ${index + 1}: ${error || result?.error || 'Unknown error'}`)
        }
      } else {
        const globalIndex = i + batchIndex
        errors.push(`Image ${globalIndex + 1}: Promise rejected - ${promiseResult.reason}`)
      }
    })

    // Memory check between batches
    const currentMemory = process.memoryUsage().heapUsed
    const memoryUsageMB = currentMemory / 1024 / 1024
    
    if (memoryUsageMB > 600) { // Lower threshold for more frequent cleanup
      if (global.gc) {
        global.gc()
      }
      // Small delay to let GC complete
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  const totalProcessingTime = Date.now() - startTime
  const totalMemoryUsed = process.memoryUsage().heapUsed - startMemory

  // Clear heartbeat logging
  clearInterval(heartbeatInterval)
  

  return {
    success: errors.length === 0,
    processedImages,
    errors,
    totalProcessingTime,
    totalMemoryUsed
  }
}

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Memory monitoring utility
 */
export function logMemoryUsage(context: string): void {
  const usage = process.memoryUsage()
  // Memory logging disabled for production
}

/**
 * Force garbage collection if available
 */
export function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc()
  } else {
    console.warn('[GC] Garbage collection not available. Start Node.js with --expose-gc flag')
  }
}

/**
 * Redis Cache Management Functions
 */
export async function clearImageCache(pattern?: string): Promise<number> {
  const cleared = await redisImageCache.clear(pattern)
  return cleared
}

export async function getCacheStats(): Promise<{ size: number, connected: boolean, memory?: string }> {
  return await redisImageCache.getStats()
}

export async function disconnectRedisCache(): Promise<void> {
  await redisImageCache.disconnect()
}

/**
 * High-performance batch processing for multiple products
 * Optimized for large CSV imports with thousands of products
 */
export async function processBulkProductImages(
  products: Array<{
    productId: string
    productName: string
    imageUrls: string[]
  }>
): Promise<{
  totalProducts: number
  successfulProducts: number
  failedProducts: number
  totalImages: number
  successfulImages: number
  failedImages: number
  totalProcessingTime: number
  averageTimePerProduct: number
  cacheStats: { size: number, connected: boolean, memory?: string }
}> {
  const startTime = Date.now()
  let totalImages = 0
  let successfulImages = 0
  let failedImages = 0
  let successfulProducts = 0
  let failedProducts = 0

  
  // Calculate total image count
  totalImages = products.reduce((sum, product) => sum + product.imageUrls.length, 0) * STREAMING_IMAGE_SIZES.length
  
  // Show initial Redis cache stats
  const initialCacheStats = await redisImageCache.getStats()

  // Process products in batches
  const PRODUCT_BATCH_SIZE = 10 // Process 10 products concurrently
  
  for (let i = 0; i < products.length; i += PRODUCT_BATCH_SIZE) {
    const productBatch = products.slice(i, i + PRODUCT_BATCH_SIZE)
    const batchNumber = Math.floor(i / PRODUCT_BATCH_SIZE) + 1
    const totalBatches = Math.ceil(products.length / PRODUCT_BATCH_SIZE)
    
    const batchStartTime = Date.now()
    
    // Process batch in parallel
    const batchPromises = productBatch.map(async (product, batchIndex) => {
      const globalIndex = i + batchIndex
      
      try {
        const result = await processProductImagesStream(
          product.productId,
          product.productName,
          product.imageUrls
        )
        
        if (result.success) {
          successfulProducts++
          successfulImages += result.processedImages.length
        } else {
          failedProducts++
          failedImages += result.errors.length
        }
        
        return { success: true, result }
        
      } catch (error: any) {
        failedProducts++
        return { success: false, error: error.message }
      }
    })
    
    // Wait for batch completion
    await Promise.allSettled(batchPromises)
    const batchTime = Date.now() - batchStartTime
    
    
    // Progress update
    const elapsed = Date.now() - startTime
    const processed = Math.min(i + PRODUCT_BATCH_SIZE, products.length)
    const remaining = products.length - processed
    const avgTimePerProduct = elapsed / processed
    const estimatedTimeRemaining = remaining * avgTimePerProduct
    
    
    // Show cache statistics
    const currentCacheStats = await redisImageCache.getStats()
    
    // Memory cleanup between batches
    if (global.gc) {
      global.gc()
    }
    
    // No delays for maximum speed
  }

  const totalProcessingTime = Date.now() - startTime
  const averageTimePerProduct = totalProcessingTime / products.length

  
  // Final cache statistics
  const finalCacheStats = await redisImageCache.getStats()
  const cacheGrowth = finalCacheStats.size - initialCacheStats.size

  return {
    totalProducts: products.length,
    successfulProducts,
    failedProducts,
    totalImages,
    successfulImages,
    failedImages,
    totalProcessingTime,
    averageTimePerProduct,
    cacheStats: finalCacheStats
  }
}
