import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import CacheModuleService from "../../../modules/cache/service"

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const { pattern, minTTL, maxTTL, returnKeys = true } = req.body as {
      pattern: string
      minTTL?: number
      maxTTL?: number
      returnKeys?: boolean
    }

    if (!pattern || typeof pattern !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Pattern is required and must be a string"
      })
    }

    // Validate TTL values if provided
    if (minTTL !== undefined && (typeof minTTL !== 'number' || minTTL < 0)) {
      return res.status(400).json({
        success: false,
        error: "minTTL must be a non-negative number"
      })
    }

    if (maxTTL !== undefined && (typeof maxTTL !== 'number' || maxTTL < 0)) {
      return res.status(400).json({
        success: false,
        error: "maxTTL must be a non-negative number"
      })
    }

    if (minTTL !== undefined && maxTTL !== undefined && minTTL >= maxTTL) {
      return res.status(400).json({
        success: false,
        error: "minTTL must be less than maxTTL"
      })
    }

    // Resolve cache service from container
    const cacheService = req.scope.resolve(Modules.CACHE) as CacheModuleService

    // Delete keys by pattern and TTL range
    const result = await cacheService.deleteByPatternAndTTL(
      pattern,
      minTTL,
      maxTTL,
      returnKeys
    )

    res.json({
      success: true,
      deleted: result.deleted,
      matched: result.matched,
      keys: result.keys,
      message: `Deleted ${result.deleted} cache entries out of ${result.matched} matched keys`
    })
  } catch (error) {
    console.error("Error deleting geocode cache by TTL:", error)
    res.status(500).json({
      success: false,
      error: "Failed to delete cache entries",
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

