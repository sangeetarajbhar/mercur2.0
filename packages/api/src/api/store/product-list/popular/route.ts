import { MedusaResponse } from "@medusajs/framework"
import { HttpTypes } from "@medusajs/framework/types"
import { ALGOLIA_MODULE, AlgoliaModuleService } from "@mercurjs/algolia"
import { RequestWithContext } from "../../products/helpers"

const BLOCKED_SEARCH_TERMS = new Set(["*", "<empty search>"])

type AnalyticsSearchTerm = {
  search: string
  count: number
  nbHits?: number
  userCount?: number
  clickCount?: number
  conversionCount?: number
  noResultCount?: number
  clickThroughRate?: number
  conversionRate?: number
  averageClickPosition?: number
}

export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse
) => {
  try {
    const { 
      limit = "10",
      startDate,
      endDate,
      indexName = "products"
    } = req.query as Record<string, string>

    const algoliaService =
      req.scope.resolve<AlgoliaModuleService>(ALGOLIA_MODULE)
    const limitNum = Math.min(Math.max(Number(limit), 1), 100)

    // Get popular search terms from Algolia Analytics API (actual user behavior)
    const analyticsRange: { startDate?: string; endDate?: string } | undefined = 
      startDate || endDate 
        ? { startDate, endDate } 
        : undefined

    let formattedData: Array<{ term: string; score: number; [key: string]: any }> = []

    try {
      // Try to get popular search terms from Algolia Analytics API (actual user behavior)
      const popularSearches: AnalyticsSearchTerm[] = await algoliaService.getPopularSearchTerms(
        indexName,
        limitNum,
        analyticsRange
      )

      if (popularSearches && popularSearches.length > 0) {
        formattedData = formatPopularSearchTerms(
          popularSearches,
          limitNum
        )
      } else {
        // Fallback to query suggestions if analytics is empty
        const suggestions = await algoliaService.searchQuerySuggestions(
          "",
          limitNum,
          "products_query_suggestionsd"
        ) as { hits?: Array<{ query?: string; popularity?: number }> }

        if (suggestions?.hits && suggestions.hits.length > 0) {
          formattedData = suggestions.hits
            .map((hit) => ({
              term: hit.query?.trim() || '',
              score: hit.popularity ?? 0,
            }))
            .filter(({ term }) => isValidSearchTerm(term))
            .slice(0, limitNum)
            .map(({ term, score }) => ({
              term: term!,
              score,
            }))
        }
      }
    } catch (analyticsError: any) {
      console.warn('[Popular Terms] Analytics API failed, falling back to query suggestions:', analyticsError.message)
      // Fallback to query suggestions if analytics fails
      try {
        const suggestions = await algoliaService.searchQuerySuggestions(
          "",
          limitNum,
          "products_query_suggestionsd"
        ) as { hits?: Array<{ query?: string; popularity?: number }> }

        if (suggestions?.hits && suggestions.hits.length > 0) {
          formattedData = suggestions.hits
            .map((hit) => ({
              term: hit.query?.trim() || '',
              score: hit.popularity ?? 0,
            }))
            .filter(({ term }) => isValidSearchTerm(term))
            .slice(0, limitNum)
            .map(({ term, score }) => ({
              term: term!,
              score,
            }))
        }
      } catch (fallbackError: any) {
        console.error('[Popular Terms] Fallback also failed:', fallbackError.message)
      }
    }

    res.status(200).json({
      limit: limitNum,
      data: formattedData,
    })
  } catch (err: any) {
    console.error("Popular terms error:", err)
    res.status(500).json({
      message: err.message,
      data: [],
    })
  }
}

function formatPopularSearchTerms(
  searches: AnalyticsSearchTerm[],
  limit?: number
) {
  const filtered = searches
    .map((searchTerm) => ({
      term: searchTerm.search?.trim(),
      count: searchTerm.count ?? 0,
      // Include additional analytics metrics
      nbHits: searchTerm.nbHits,
      userCount: searchTerm.userCount,
      clickCount: searchTerm.clickCount,
      conversionCount: searchTerm.conversionCount,
      clickThroughRate: searchTerm.clickThroughRate,
      conversionRate: searchTerm.conversionRate,
    }))
    .filter(({ term }) => isValidSearchTerm(term))

  const sliced = filtered.slice(0, limit ?? searches.length)

  return sliced.map(({ term, count, ...metrics }) => ({
    term: term!,
    score: count, // Use count as the score for sorting
    ...metrics, // Include additional analytics metrics
  }))
}

function isValidSearchTerm(term?: string | null) {
  if (!term) {
    return false
  }

  const normalized = term.trim().toLowerCase()
  if (!normalized.length) {
    return false
  }

  return !BLOCKED_SEARCH_TERMS.has(normalized)
}
