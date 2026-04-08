import {  MedusaResponse } from '@medusajs/framework'
import { RequestWithContext } from "../../products/helpers"
import { HttpTypes } from "@medusajs/framework/types"
import { ALGOLIA_MODULE } from '@mercurjs/algolia'
import { AlgoliaModuleService } from '@mercurjs/algolia'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type { SearchResponse } from "algoliasearch"

const QUERY_SUGGESTIONS_INDEX =
  process.env.ALGOLIA_QUERY_SUGGESTIONS_INDEX || 'products_query_suggestionsd'


async function getCategoryIdsFromDatabase(
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  categoryNames: string[]
): Promise<Map<string, string>> {
  try {
    const cleanedNames = Array.from(
      new Set(
        (categoryNames || [])
          .map((name) => name?.trim())
          .filter(Boolean)
          .map((name) => name!.toLowerCase())
      )
    )

    if (!cleanedNames.length) {
      return new Map()
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Query categories with case-insensitive exact name matching using $or
    // Build $or conditions for each name (case-insensitive exact match)
    const orConditions = cleanedNames.map(name => ({
      name: { $ilike: name }
    }))

    const { data: categories } = await query.graph({
      entity: 'product_category',
      fields: ['id', 'name'],
      filters: {
        $or: orConditions
      }
    })

    const categoryMap = new Map<string, string>()

    if (categories && Array.isArray(categories)) {
      categories.forEach((category: { id: string; name: string }) => {
        if (!category?.id || !category?.name) {
          return
        }

        const key = category.name.toLowerCase()
        if (cleanedNames.includes(key)) {
          categoryMap.set(key, category.id)
        }
      })
    }

    return categoryMap
  } catch (error) {
    console.error('Failed to fetch category IDs from database:', error instanceof Error ? error.message : error);
    return new Map()
  }
}

export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse
) => {

  try {
    const { 
      query = "", 
      limit = "5", 
      locationIds,
      ...rest 
    } = req.query as Record<string, string>;

    // Don't return suggestions for short queries
    if (!query || query.trim().length < 2) {
      return res.status(200).json({
        query: query,
        products: [],
        categories: [],
        brands: [],
        tags: [],
        totalCount: 0
      });
    }

    const algoliaService = req.scope.resolve<AlgoliaModuleService>(ALGOLIA_MODULE);
    const limitNum = Math.min(Number(limit), 10); 
    const QUERY_SUGGESTION_LIMIT = 6;
    const querySuggestions: Array<{ text: string; score: number }> = [];

    const facetFilters: string[][] = [];

    // Handle location filtering for suggestions
    if (locationIds) {
      const locationArray = Array.isArray(locationIds) ? locationIds : locationIds.split(",").map(v => v.trim());
      const locationFilters = locationArray.map(locationId => `available_locations:${locationId}`);
      facetFilters.push(locationFilters);
    }

    // Handle other filters
    for (const [key, value] of Object.entries(rest)) {
      if (!key || !value || key === 'locationIds') continue;
      const values = Array.isArray(value) ? value : value.split(",").map(v => v.trim());
      facetFilters.push(values.map(v => `${key}:${v}`));
    }
    
    try {
      const querySuggestionResult = await (algoliaService as any).searchQuerySuggestions(
        query,
        QUERY_SUGGESTION_LIMIT,
        QUERY_SUGGESTIONS_INDEX
      );

      if (querySuggestionResult?.hits?.length) {
        querySuggestionResult.hits.some((hit: Record<string, any>, index: number) => {
          let rawText: string | undefined;
          if (typeof hit.query === "string") {
            rawText = hit.query;
          } else if (typeof hit.query_text === "string") {
            rawText = hit.query_text;
          } else if (typeof hit.title === "string") {
            rawText = hit.title;
          } else if (typeof hit.value === "string") {
            rawText = hit.value;
          } else if (typeof hit.suggestion === "string") {
            rawText = hit.suggestion;
          }

          const text = rawText?.trim();
          if (!text) {
            return false;
          }

          querySuggestions.push({
            text,
            score: QUERY_SUGGESTION_LIMIT - index,
          });

          return querySuggestions.length >= QUERY_SUGGESTION_LIMIT;
        });

      }
    } catch (error) {
      console.error('Failed to fetch query suggestions:', error instanceof Error ? error.message : error);
    }

    const searchResult = await algoliaService.searchAutocomplete(
      "*", // Search everything to get all data
      Math.max(limitNum * 20, 200), // Get even more results to ensure we have all searchKey data
      "products",
      facetFilters,
      ["title", "brand.name", "categories.name", "tags.value", "subtitle", "variants.searchKey"]
    ) as SearchResponse<any>;

    // Extract and rank suggestions from search results
    const suggestions = new Map<string, { text: string; type: string; score: number; id?: string; count?: number }>();
    const categoryNames = new Set<string>(); // Collect unique category names
    
    
    if (searchResult.hits) {
      searchResult.hits.forEach((product: any, index: number) => {
        // Add product title with higher score for exact matches

        if (product.title) {
          const score = calculateScore(product.title, query, index, 'product');
          if (score > 0) {
            suggestions.set(product.title.toLowerCase(), {
              text: product.title,
              type: 'product',
              score: score,
              id: product.objectID
            });
          }
        }
        
        // Add brand name
        if (product.brand?.name) {
          const score = calculateScore(product.brand.name, query, index, 'brand');
          if (score > 0) {
            suggestions.set(product.brand.name.toLowerCase(), {
              text: product.brand.name,
              type: 'brand',
              score: score
            });
          }
        }
        
        // Collect category names for database lookup
        if (product.categories) {
          product.categories.forEach((category: any) => {
            if (category.name) {
              categoryNames.add(category.name);
            }
          });
        }
        
        // Add tag values
        if (product.tags) {
          product.tags.forEach((tag: any) => {
            if (tag.value) {
              const score = calculateScore(tag.value, query, index, 'tag');
              if (score > 0) {
                suggestions.set(tag.value.toLowerCase(), {
                  text: tag.value,
                  type: 'tag',
                  score: score
                });
              }
            }
          });
        }

        // Add variant search keys for auto-complete
        if (product.variants) {
          product.variants.forEach((variant: any) => {
            if (variant.searchKey) {
              // Split searchKey by common separators and find auto-complete matches
              const keywords = variant.searchKey.split(/[,/\s]+/).filter((keyword: string) => {
                const trimmed = keyword.trim();
                // Keep words that are longer than the query and not pure numbers
                return trimmed.length > 0 && !/^\d+$/.test(trimmed);
              });
              
              keywords.forEach((keyword: string) => {
                const trimmedKeyword = keyword.trim();
                const lowerKeyword = trimmedKeyword.toLowerCase();
                const lowerQuery = query.toLowerCase();
                
                // Check if this keyword starts with the query (auto-complete match)
                if (lowerKeyword.startsWith(lowerQuery) && lowerKeyword !== lowerQuery) {
                  const score = calculateScore(trimmedKeyword, query, index, 'product');
                  if (score > 0) {
                    const keywordKey = lowerKeyword;
                    // Only add if not already exists or if this has a better score
                    if (!suggestions.has(keywordKey) || suggestions.get(keywordKey)!.score < score) {
                      suggestions.set(keywordKey, {
                        text: trimmedKeyword,
                        type: 'suggestion',
                        score: score,
                        id: product.objectID
                      });
                    }
                  }
                }
              });
            }
          });
        }
      });
    }

    // Fetch category IDs from database
    let categoryIdMap = new Map<string, string>();
    if (categoryNames.size > 0) {
      try {
        categoryIdMap = await getCategoryIdsFromDatabase(req, Array.from(categoryNames));
      } catch (error) {
        console.error('Category ID lookup failed:', error instanceof Error ? error.message : error);
        categoryIdMap = new Map();
      }
    }


    // Now process categories with their IDs
    if (searchResult.hits) {
      searchResult.hits.forEach((product: any, index: number) => {
        if (product.categories) {
          product.categories.forEach((category: any) => {
            if (category.name) {
              const score = calculateScore(category.name, query, index, 'category');
              if (score > 0) {
                const categoryKey = category.name.toLowerCase();
                const categoryId = categoryIdMap.get(category.name.toLowerCase());
                
                // Only add if not already exists or if this has a better score
                if (!suggestions.has(categoryKey) || suggestions.get(categoryKey)!.score < score) {
                  suggestions.set(categoryKey, {
                    id: categoryId || undefined,
                    text: category.name,
                    type: 'category',
                    score: score
                  });
                }
              }
            }
          });
        }
      });
    }

    // Convert to array, sort by score, and limit
    const filteredSuggestions = Array.from(suggestions.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limitNum);

    // We already have all the data from the wildcard search above

    // If we don't have enough suggestions, get more from Algolia with broader search
    if (filteredSuggestions.length < limitNum) {
      const additionalSuggestions = await getAdditionalSuggestionsFromAlgolia(
        algoliaService, 
        query, 
        limitNum - filteredSuggestions.length,
        facetFilters
      );
      
      const existingTexts = new Set(filteredSuggestions.map(s => s.text.toLowerCase()));
      
      additionalSuggestions
        .filter(suggestion => !existingTexts.has(suggestion.text.toLowerCase()))
        .forEach(suggestion => {
          filteredSuggestions.push(suggestion);
        });
    }

    // Get category counts from Algolia facets
    const categoryCounts = await getCategoryCountsFromAlgolia(algoliaService, query, facetFilters);
    
    // Update category suggestions with counts
    filteredSuggestions.forEach(suggestion => {
      if (suggestion.type === 'category' && categoryCounts[suggestion.text]) {
        suggestion.count = categoryCounts[suggestion.text];
      }
    });

    // Add categories from Algolia facets that match the query but aren't in suggestions yet
    const existingCategoryNames = new Set(filteredSuggestions.filter(s => s.type === 'category').map(s => s.text.toLowerCase()));
    
    Object.entries(categoryCounts).forEach(([categoryName, count]) => {
      if (!existingCategoryNames.has(categoryName.toLowerCase())) {
        const score = calculateScore(categoryName, query, 0, 'category');
        if (score > 0) {
          filteredSuggestions.push({
            text: categoryName,
            type: 'category',
            score: score,
            count: count
          });
        }
      }
    });

    // Re-sort suggestions after adding categories with counts
    filteredSuggestions.sort((a, b) => b.score - a.score);

    // Prepare final response with suggestions and categories
    const categorySuggestions = filteredSuggestions
      .filter((suggestion) => suggestion.type === 'category')
      .map((suggestion) => ({
        id: suggestion.id,
        name: suggestion.text,
        count: suggestion.count || 0,
        score: suggestion.score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limitNum)

    const seenSuggestionTexts = new Set<string>()
    const finalQuerySuggestions = querySuggestions
      .filter((suggestion) => {
        const lowerText = suggestion.text.toLowerCase()
        if (seenSuggestionTexts.has(lowerText)) {
          return false
        }
        seenSuggestionTexts.add(lowerText)
        return true
      })
      .slice(0, QUERY_SUGGESTION_LIMIT)

    res.status(200).json({
      query,
      suggestions: finalQuerySuggestions,
      categories: categorySuggestions,

    });

  } catch (err: any) {
    res.status(500).json({ 
      message: err.message,
      suggestions: [],
      count: 0
    });
  }
};

// Helper function to calculate suggestion score
function calculateScore(text: string, query: string, index: number, type: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    let score = 0;
    
    if (lowerText === lowerQuery) {
      score += 120;
    } else if (lowerText.startsWith(lowerQuery)) {
      score += 100;
    } else if (new RegExp(`\\b${lowerQuery}`, 'i').test(lowerText)) {
      score += 70;
    } else if (lowerText.includes(lowerQuery)) {
      score += 50;
    } else if (isFuzzyMatch(lowerText, lowerQuery)) {
      score += 30;
    }
  
  if (score === 0) {
    return 0;
  }

    switch (type) {
      case 'product':
        score += 20;
        break;
      case 'brand':
        score += 15;
        break;
      case 'category':
        score += 10;
        break;
      case 'tag':
        score += 5;
        break;
      case 'suggestion':
        score += 25;
        break;
    }
  
    score += Math.max(0, 10 - index);
  
    return score;
  }
  

// Helper function to check fuzzy match
function isFuzzyMatch(text: string, query: string): boolean {
  if (query.length < 1) return false;
  
  // Check if all characters in query appear in order in text
  let queryIndex = 0;
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === query.length;
}

// Helper function to get additional suggestions from Algolia with broader search
async function getAdditionalSuggestionsFromAlgolia(
  algoliaService: any,
  query: string,
  limit: number,
  facetFilters?: string[][]
): Promise<{ text: string; type: string; score: number; id?: string }[]> {
  const suggestions = new Map<string, { text: string; type: string; score: number; id?: string }>();
  
  try {
    // Try different search strategies to get more suggestions
    
    // 1. Search with wildcard for broader matching
    const wildcardResult = await algoliaService.searchAutocomplete(
      `${query}*`,
      limit * 2,
      "products",
      facetFilters,
      ["title", "brand.name", "categories.name", "tags.value", "subtitle", "variants.searchKey"]
    );
    
    if (wildcardResult.hits) {
      wildcardResult.hits.forEach((product: any, index: number) => {
        // Add product title
        if (product.title) {
          const score = calculateScore(product.title, query, index, 'product');
          if (score > 0) {
            suggestions.set(product.title.toLowerCase(), {
              text: product.title,
              type: 'product',
              score: score
            });
          }
        }
        
        // Add brand name
        if (product.brand?.name) {
          const score = calculateScore(product.brand.name, query, index, 'brand');
          if (score > 0) {
            suggestions.set(product.brand.name.toLowerCase(), {
              text: product.brand.name,
              type: 'brand',
              score: score
            });
          }
        }
        
        if (product.categories) {
          product.categories.forEach((category: any) => {
            if (category.name && category.name.toLowerCase().startsWith(query.toLowerCase())) {
              const score = calculateScore(category.name, query, index, 'category');
              suggestions.set(category.name.toLowerCase(), {
                id: category.id || null, // Try different ID fields
                text: category.name,
                type: 'category',
                score: score
              });
            }
          });
        }
          
        
        // Add tag values
        if (product.tags) {
            product.tags.forEach((tag: any) => {
              if (tag.value && tag.value.toLowerCase().startsWith(query.toLowerCase())) {
                const score = calculateScore(tag.value, query, index, 'tag');
                suggestions.set(tag.value.toLowerCase(), {
                  text: tag.value,
                  type: 'tag',
                  score: score
                });
              }
            });
          }
          

        // Add variant search keys for auto-complete
        if (product.variants) {
          product.variants.forEach((variant: any) => {
            if (variant.searchKey) {
        
              // Split searchKey by common separators and find auto-complete matches
              const keywords = variant.searchKey.split(/[,/\s]+/).filter((keyword: string) => {
                const trimmed = keyword.trim();
                // Keep words that are longer than the query and not pure numbers
                return trimmed.length > 0 && !/^\d+$/.test(trimmed);
              });
              
        
              
              keywords.forEach((keyword: string) => {
                const trimmedKeyword = keyword.trim();
                const lowerKeyword = trimmedKeyword.toLowerCase();
                const lowerQuery = query.toLowerCase();
                
          
                
                // Check if this keyword starts with the query (auto-complete match)
                if (lowerKeyword.startsWith(lowerQuery) && lowerKeyword !== lowerQuery) {
                  const score = calculateScore(trimmedKeyword, query, index, 'product');
                  if (score > 0) {
                    const keywordKey = lowerKeyword;
                    // Only add if not already exists or if this has a better score
                    if (!suggestions.has(keywordKey) || suggestions.get(keywordKey)!.score < score) {
                      suggestions.set(keywordKey, {
                        text: trimmedKeyword,
                        type: 'suggestion',
                        score: score,
                        id: product.objectID
                      });
                    }
                  }
                }
              });
            }
          });
        }
      });
    }
    
    // 2. If still not enough, try searching for popular terms without query filter
    if (suggestions.size < limit) {
      const popularResult = await algoliaService.searchIndex(
        "*", // Search everything
        0,
        limit * 3,
        "products",
        undefined,
        facetFilters,
        ["title", "brand.name", "categories.name", "tags.value"]
      );
      
      if (popularResult.hits) {
        popularResult.hits.forEach((product: any, index: number) => {
          // Only add if it matches our query
          const allTexts = [
            product.title,
            product.brand?.name,
            ...(product.categories || []).map((c: any) => c.name),
            ...(product.tags || []).map((t: any) => t.value)
          ].filter(Boolean);
          
          allTexts.forEach(text => {
            if (text.toLowerCase().includes(query.toLowerCase()) && !suggestions.has(text.toLowerCase())) {
              const type = product.title === text ? 'product' : 
                          product.brand?.name === text ? 'brand' :
                          product.categories?.some((c: any) => c.name === text) ? 'category' : 'tag';
              
              suggestions.set(text.toLowerCase(), {
                text: text,
                type: type,
                score: calculateScore(text, query, index, type)
              });
            }
          });
        });
      }
    }
    
  } catch (error) {
    console.error('Failed to fetch additional suggestions:', error instanceof Error ? error.message : error);
  }
  
  return Array.from(suggestions.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Helper function to get category counts from Algolia facets
async function getCategoryCountsFromAlgolia(
  algoliaService: any,
  query: string,
  facetFilters?: string[][]
): Promise<Record<string, number>> {
  try {
    const facetsResult = await algoliaService.searchIndex(
      query, // Use the actual query to filter categories
      0,
      0, // We only want facets, not hits
      "products",
      undefined,
      facetFilters,
      ["filters.category"] 
    );

    const categoryCounts: Record<string, number> = {};

    
    if (facetsResult.facets && facetsResult.facets['filters.category']) {
      Object.entries(facetsResult.facets['filters.category']).forEach(([name, count]) => {
        categoryCounts[name] = count as number;
      });
    }

    return categoryCounts;
  } catch (error) {
    console.error('Failed to fetch category counts:', error instanceof Error ? error.message : error);
    return {};
  }
}

