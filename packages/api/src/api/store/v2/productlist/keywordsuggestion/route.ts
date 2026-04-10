import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { SEARCH_MODULE } from '../../../../../modules/search'
import SearchModuleService from '../../../../../modules/search/service'

/**
 * Keyword Suggestion API Route
 * Returns keyword suggestions matching the query prefix, sorted by search popularity.
 * 
 * Query Parameters:
 * - query: string (optional) - Search prefix (max 128 chars). Empty = popular keywords
 * - top_category: string (optional) - Filter by category (e.g., "Women", "Men", "ALL")
 * - lang: string (optional) - Language code ("en", "ko", etc.)
 * - count: number (optional) - Number of suggestions to return (max 50)
 * - sale: string (optional) - Filter by sale status ("all", "true", "false")
 * - pinned: boolean (optional) - Include admin-pinned keywords
 * - detail: boolean (optional) - Include purchase stats for each keyword
 * - days: number (optional) - Days of stats to aggregate (1-90, requires detail=true)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const searchService: SearchModuleService = req.scope.resolve(SEARCH_MODULE)

    const params: Record<string, unknown> = {}
    
    if (req.query.query !== undefined) {
      const queryStr = String(req.query.query)
      params.query = queryStr.length > 128 ? queryStr.substring(0, 128) : queryStr
    }
    
    if (req.query.top_category) {
      params.top_category = String(req.query.top_category)
    }
    
    if (req.query.lang) {
      params.lang = String(req.query.lang)
    }
    
    if (req.query.count) {
      const count = parseInt(String(req.query.count), 10)
      if (!isNaN(count)) {
        params.count = Math.min(50, Math.max(1, count))
      }
    }
    
    if (req.query.sale) {
      params.sale = String(req.query.sale)
    }
    
    if (req.query.pinned !== undefined) {
      params.pinned = String(req.query.pinned).toLowerCase() === 'true'
    }
    
    if (req.query.detail !== undefined) {
      params.detail = String(req.query.detail).toLowerCase() === 'true'
    }
    
    if (req.query.days) {
      const days = parseInt(String(req.query.days), 10)
      if (!isNaN(days)) {
        params.days = Math.min(90, Math.max(1, days))
      }
    }

    const result = await searchService.getKeywordSuggestions(req.scope, params)
    res.json(result)
  } catch (error: unknown) {
    console.error('[Keyword Suggestions] Error fetching suggestions:', error instanceof Error ? error.message : String(error))
    res.status(500).json({
      error: 'Keyword suggestions unavailable',
      code: 'KEYWORD_SUGGESTIONS_ERROR'
    })
  }
}

