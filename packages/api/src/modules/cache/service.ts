import { ICacheService } from "@medusajs/framework/types"
import Redis from "ioredis"

class CacheModuleService implements ICacheService {
  protected readonly redis_: Redis
  protected readonly prefix_ = "medusa:"
  protected readonly ttl_: number

  constructor(container: any, options: any = {}) {
    // Create Redis client directly from options
    this.redis_ = new Redis(options.redisUrl || process.env.REDIS_URL)
    this.ttl_ = options.ttl || 86400 // Default 24 hours

  }

  /**
   * Get cache key with prefix
   */
  private getCacheKey(key: string): string {
    // If key already has the prefix, don't add it again
    if (key.startsWith(this.prefix_)) {
      return key
    }
    return `${this.prefix_}${key}`
  }

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key)
      const data = await this.redis_.get(cacheKey)

      if (!data) {
        return null
      }

      // Try to parse as JSON, if fails return as string
      try {
        return JSON.parse(data) as T
      } catch {
        return data as T
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in seconds (null/undefined = permanent, 0 = skip)
   */
  async set(key: string, data: unknown, ttl?: number | null): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key)
      const stringified = JSON.stringify(data)

      // If ttl is exactly 0, skip caching
      if (ttl === 0) {
        return
      }

      // If ttl is null or undefined, set without expiry (permanent)
      if (ttl == null) {
        await this.redis_.set(cacheKey, stringified)
        return
      }

      // Otherwise, set with TTL
      await this.redis_.set(cacheKey, stringified, "EX", ttl)
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
    }
  }

  /**
   * Set permanent cache entry (no expiry)
   */
  async setPermanent(key: string, data: unknown): Promise<void> {
    await this.set(key, data, null)
  }

  /**
   * Invalidate (delete) cache entry
   */
  async invalidate(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key)
      await this.redis_.del(cacheKey)
    } catch (error) {
      console.error(`Cache invalidate error for key ${key}:`, error)
    }
  }

  async getMultiple(keys: string[]) {
    const values = await Promise.all(
      keys.map((key) => this.get(key))
    )

    return keys.reduce((acc, key, i) => {
      acc[key] = values[i]
      return acc
    }, {})
  }

  /**
   * Get multiple hash entries from cache
   * @param keys - Array of cache keys
   * @returns Object with keys as properties and hash data as values
   */
  async hgetMultiple<T = Record<string, any>>(keys: string[]): Promise<Record<string, T | null>> {
    if (!keys || keys.length === 0) {
      return {}
    }

    try {
      const values = await Promise.all(
        keys.map((key) => this.hget<T>(key))
      )

      return keys.reduce((acc, key, i) => {
        acc[key] = values[i]
        return acc
      }, {} as Record<string, T | null>)
    } catch (error) {
      console.error(`Cache hgetMultiple error:`, error)
      return keys.reduce((acc, key) => {
        acc[key] = null
        return acc
      }, {} as Record<string, T | null>)
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    if (!keys || keys.length === 0) {
      return []
    }

    try {
      const cacheKeys = keys.map(k => this.getCacheKey(k))
      const values = await this.redis_.mget(...cacheKeys)

      return values.map(value => {
        if (!value) return null
        try {
          return JSON.parse(value) as T
        } catch {
          return value as T
        }
      })
    } catch (error) {
      console.error(`Cache mget error:`, error)
      return keys.map(() => null)
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(entries: { key: string; data: unknown; ttl?: number }[]): Promise<void> {
    if (!entries || entries.length === 0) {
      return
    }

    try {
      const pipeline = this.redis_.pipeline()

      for (const entry of entries) {
        const cacheKey = this.getCacheKey(entry.key)
        const stringified = JSON.stringify(entry.data)
        const ttl = entry.ttl ?? this.ttl_

        if (ttl === 0) {
          continue
        }

        if (ttl == null) {
          pipeline.set(cacheKey, stringified)
        } else {
          pipeline.set(cacheKey, stringified, "EX", ttl)
        }
      }

      await pipeline.exec()
    } catch (error) {
      console.error(`Cache mset error:`, error)
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const cachePattern = this.getCacheKey(pattern)
      const keys = await this.redis_.keys(cachePattern)

      // Remove prefix from returned keys
      return keys.map(key =>
        key.startsWith(this.prefix_) ? key.substring(this.prefix_.length) : key
      )
    } catch (error) {
      console.error(`Cache keys error:`, error)
      return []
    }
  }

  /**
   * Get Redis pipeline for batch operations
   */
  pipeline() {
    return this.redis_.pipeline()
  }

  /**
   * Access raw Redis client
   */
  get redis(): Redis {
    return this.redis_
  }

  /**
   * Set hash data in cache using HSET
   * @param key - Cache key
   * @param data - Object data to store as hash fields
   * @param ttl - Time to live in seconds (null/undefined = permanent, 0 = skip)
   */
  async hset(key: string, data: Record<string, any>, ttl?: number | null): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key)

      // If ttl is exactly 0, skip caching
      if (ttl === 0) {
        return
      }


      // Convert all values to strings (Redis requirement for hashes)
      // For complex types (arrays, objects), stringify them
      const hashData: Record<string, string> = {}
      for (const [field, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
          hashData[field] = ''
        } else if (typeof value === 'object') {
          hashData[field] = JSON.stringify(value)
        } else {
          hashData[field] = String(value)
        }
      }

      // Set hash fields
      const result = await this.redis_.hset(cacheKey, hashData)


      // Set TTL if provided
      if (ttl != null && ttl > 0) {
        await this.redis_.expire(cacheKey, ttl)
      }


    } catch (error: any) {
      // Handle WRONGTYPE error - key exists but is not a hash (old format)
      if (error?.message?.includes('WRONGTYPE')) {

        // Delete the old string-based key
        await this.invalidate(key)
        // Retry the operation
        try {
          const cacheKey = this.getCacheKey(key)
          await this.redis_.hset(cacheKey, Object.entries(data).reduce((acc, [field, value]) => {
            if (value === null || value === undefined) {
              acc[field] = ''
            } else if (typeof value === 'object') {
              acc[field] = JSON.stringify(value)
            } else {
              acc[field] = String(value)
            }
            return acc
          }, {} as Record<string, string>))

          if (ttl != null && ttl > 0) {
            await this.redis_.expire(cacheKey, ttl)
          }

        } catch (retryError) {
          console.error(`Cache hset retry error for key ${key}:`, retryError)
        }
      } else {
        console.error(`Cache hset error for key ${key}:`, error)
      }
    }
  }

  /**
   * Get hash data from cache using HGETALL
   * @param key - Cache key
   * @returns Object with hash fields or null if not found
   */
  async hget<T = Record<string, any>>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key)
      const hashData = await this.redis_.hgetall(cacheKey)

      if (!hashData || Object.keys(hashData).length === 0) {
        return null
      }

      // Parse JSON strings back to objects/arrays
      const result: Record<string, any> = {}
      for (const [field, value] of Object.entries(hashData)) {
        if (value === '') {
          result[field] = null
        } else {
          // Try to parse as JSON, if fails keep as string
          try {
            result[field] = JSON.parse(value as string)
          } catch {
            // Check if it's a boolean string
            if (value === 'true') {
              result[field] = true
            } else if (value === 'false') {
              result[field] = false
            } else if (!isNaN(Number(value)) && value !== '') {
              // Try to parse as number
              result[field] = Number(value)
            } else {
              result[field] = value
            }
          }
        }
      }

      return result as T
    } catch (error: any) {
      // Handle WRONGTYPE error - key exists but is not a hash (old format)
      if (error?.message?.includes('WRONGTYPE')) {

        // Delete the old string-based key
        await this.invalidate(key)
        return null
      }
      console.error(`Cache hget error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Get specific field from hash
   * @param key - Cache key
   * @param field - Field name
   * @returns Field value or null
   */
  async hgetField<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key)
      const value = await this.redis_.hget(cacheKey, field)

      if (!value) {
        return null
      }

      try {
        return JSON.parse(value) as T
      } catch {
        return value as T
      }
    } catch (error) {
      console.error(`Cache hget field error for key ${key}, field ${field}:`, error)
      return null
    }
  }

  /**
   * Delete hash from cache
   * @param key - Cache key
   */
  async hdel(key: string): Promise<void> {
    await this.invalidate(key)
  }

  /**
   * Remove a single field from a Redis hash (does not delete the entire key).
   */
  async hdelField(key: string, field: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key)
      await this.redis_.hdel(cacheKey, field)
    } catch (error) {
      console.error(`Cache hdelField error for key ${key}, field ${field}:`, error)
    }
  }

  /**
   * Set permanent hash data (no expiry)
   * @param key - Cache key
   * @param data - Object data to store as hash fields
   */
  async hsetPermanent(key: string, data: Record<string, any>): Promise<void> {
    await this.hset(key, data, null)
  }

  /**
   * Get promotion rules from cache using HGET
   * @param promotionCode - Promotion code
   * @returns Cached promotion rules or null
   */
  async getPromotionRules(promotionCode: string): Promise<any | null> {
    const key = `promotion_rules:${promotionCode}`
    return await this.hget(key)
  }

  /**
   * Set promotion rules in cache using HSET
   * @param promotionCode - Promotion code
   * @param rules - Promotion rules object
   * @param ttl - Time to live in seconds (default: 3600 = 1 hour)
   */
  async setPromotionRules(promotionCode: string, rules: any, ttl: number = 3600): Promise<void> {
    const key = `promotion_rules:${promotionCode}`
    await this.hset(key, rules, ttl)
  }

  /**
   * Invalidate promotion rules cache
   * @param promotionCode - Promotion code to invalidate
   */
  async invalidatePromotionRules(promotionCode: string): Promise<void> {
    const key = `promotion_rules:${promotionCode}`
    await this.hdel(key)
  }

  /**
   * Delete cache entries by pattern and TTL range
   * @param pattern - Key pattern to match (e.g., "geocoding:*")
   * @param minTTL - Minimum TTL in seconds (inclusive, keys with TTL >= minTTL)
   * @param maxTTL - Maximum TTL in seconds (inclusive, keys with TTL <= maxTTL)
   * @param returnKeys - Whether to return the list of deleted keys (default: true, set to false for large deletions)
   * @returns Object with deleted count and matched keys
   */
  async deleteByPatternAndTTL(
    pattern: string,
    minTTL?: number,
    maxTTL?: number,
    returnKeys: boolean = true
  ): Promise<{ deleted: number; matched: number; keys: string[] }> {
    try {
      // Ensure pattern has prefix if not already present
      const cachePattern = this.getCacheKey(pattern)

      // Use SCAN instead of KEYS for better performance on large datasets
      const matchedKeys: string[] = []
      let cursor = '0'

      do {
        const [nextCursor, keys] = await this.redis_.scan(
          cursor,
          'MATCH',
          cachePattern,
          'COUNT',
          100
        )
        cursor = nextCursor
        matchedKeys.push(...keys)
      } while (cursor !== '0')

      if (matchedKeys.length === 0) {
        return { deleted: 0, matched: 0, keys: [] }
      }

      // Check TTL for each key and filter by range (inclusive)
      // Use pipeline for batch TTL checks to improve performance
      const keysToDelete: string[] = []
      const ttlBatchSize = 100

      for (let i = 0; i < matchedKeys.length; i += ttlBatchSize) {
        const batch = matchedKeys.slice(i, i + ttlBatchSize)
        const pipeline = this.redis_.pipeline()

        // Add TTL commands to pipeline
        for (const key of batch) {
          pipeline.ttl(key)
        }

        const results = await pipeline.exec()

        // Process TTL results
        for (let j = 0; j < batch.length; j++) {
          const key = batch[j]
          const result = results?.[j]
          const err = result?.[0] || null
          const ttl = (result?.[1] as number) ?? -2

          if (err) {
            // Skip keys
            continue
          }

          // Apply TTL filters for keys with expiry (inclusive)
          const meetsMinTTL = minTTL === undefined || ttl >= minTTL
          const meetsMaxTTL = maxTTL === undefined || ttl <= maxTTL

          if (meetsMinTTL && meetsMaxTTL) {
            keysToDelete.push(key)
          }
        }
      }

      if (keysToDelete.length === 0) {
        return { deleted: 0, matched: matchedKeys.length, keys: [] }
      }

      // Delete keys in batches using pipeline for efficiency
      const deleteBatchSize = 100
      let deletedCount = 0

      for (let i = 0; i < keysToDelete.length; i += deleteBatchSize) {
        const batch = keysToDelete.slice(i, i + deleteBatchSize)
        const pipeline = this.redis_.pipeline()

        for (const key of batch) {
          pipeline.del(key)
        }

        const results = await pipeline.exec()
        deletedCount += results?.filter(([err, result]) => !err && result).length || 0
      }

      // Remove prefix from returned keys for consistency (only if requested)
      const keysWithoutPrefix = returnKeys
        ? keysToDelete.map(key =>
            key.startsWith(this.prefix_) ? key.substring(this.prefix_.length) : key
          )
        : []

      return {
        deleted: deletedCount,
        matched: matchedKeys.length,
        keys: keysWithoutPrefix
      }
    } catch (error) {
      console.error(`Cache deleteByPatternAndTTL error for pattern ${pattern}:`, error)
      throw error
    }
  }
}

export default CacheModuleService
