import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { SEARCH_MODULE } from '../../../../../modules/search'
import SearchModuleService from '../../../../../modules/search/service'
import { SEARCH_CONFIG } from '../../../../../modules/search/config'
import { CollectionListResponse } from '../../../../../modules/search/strategies/yesplz-strategies/yesplz-service'

/**
 * Store Collections Route
 * Lists collections from the active search provider
 * 
 * Query Parameters:
 * - search: string (optional) - Search query for collections
 * - status: string (optional) - Filter by status: 'draft', 'published', 'archived', 'scheduled'
 * - sort: string (optional) - Sort order: 'created_at', '-created_at', 'updated_at', '-updated_at', 'title', '-title', 'product_count', '-product_count'
 * - page: number (optional) - Page number (1-based)
 * - page_size: number (optional) - Number of items per page
 * - offset: number (optional) - Number of items to skip (default: 0)
 * - limit: number (optional) - Number of items to return (default: 48, max: 250)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const searchService: SearchModuleService = req.scope.resolve(SEARCH_MODULE)

    // Extract and parse query parameters
    const params: Record<string, unknown> = {}
    
    // Search query
    if (req.query.search) {
      params.search = String(req.query.search)
    }
    
    // Status filter - pass through to API (API will validate)
    if (req.query.status) {
      params.status = String(req.query.status)
    }
    
    // Sort option - pass through to API (API will validate)
    if (req.query.sort) {
      params.sort = String(req.query.sort)
    }
    
    // Pagination - support both page/page_size and offset/limit
    if (req.query.page) {
      const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
      const pageSize = req.query.page_size 
        ? Math.min(SEARCH_CONFIG.MAX_LIMIT, Math.max(1, parseInt(String(req.query.page_size), 10) || 10))
        : SEARCH_CONFIG.DEFAULT_LIMIT
      params.page = page
      params.page_size = pageSize
    } else {
      // Use offset/limit if page not provided
      params.offset = Math.max(0, parseInt(String(req.query.offset || SEARCH_CONFIG.DEFAULT_OFFSET), 10) || SEARCH_CONFIG.DEFAULT_OFFSET)
      params.limit = Math.min(SEARCH_CONFIG.MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit || SEARCH_CONFIG.DEFAULT_LIMIT), 10) || SEARCH_CONFIG.DEFAULT_LIMIT))
    }

    // Call search service to list collections
    const result = await searchService.listCollections(req.scope, params)

    // Return the response
    const collectionResult = result as unknown as CollectionListResponse
    res.json({
      collections: collectionResult.results || [],
      totalCount: collectionResult.totalCount || 0,
      hasNextPage: collectionResult.hasNextPage || false,
      pagination: collectionResult.pagination || {
        currentPage: 1,
        pageSize: SEARCH_CONFIG.DEFAULT_LIMIT,
        totalPages: 1,
        offset: SEARCH_CONFIG.DEFAULT_OFFSET
      }
    })
  } catch (error: unknown) {
    console.error('[Store Collections] Error listing collections:', error instanceof Error ? error.message : String(error))
    res.status(500).json({
      error: 'Collections unavailable',
      code: 'COLLECTIONS_ERROR'
    })
  }
}

