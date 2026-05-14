
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import CustomCacheModuleService from '../../modules/cache/service'
import promotionExtensionLink from '../../links/promotion-custom'
import { getCustomPromotionService } from './get-custom-promotion-service'
import promotionSellerLink from '@mercurjs/core/links/promotion-seller-link'

/**
 * Standard fields to fetch for promotion extension queries
 * Can be customized with optional parameters
 */
export function getPromotionExtensionFields(options?: {
  includeSellerIds?: boolean
  includeOverrideExisting?: boolean
  includeApplicableOn?: boolean
}): string[] {
  const {
    includeSellerIds = false,
    includeOverrideExisting = false,
    includeApplicableOn = true
  } = options || {}

  const baseFields = [
    "id",
    "promotion_id",
    "promotion_extension_id",
    "promotion_extension.id",
    "promotion_extension.custom_tagline",
    "promotion_extension.terms_and_conditions",
    "promotion_extension.cart_sub_total",
    "promotion_extension.promo_code_upper_limit",
    "promotion_extension.first_customer",
    "promotion_extension.for_seller",
    "promotion_extension.is_hidden",
  ]

  if (includeSellerIds) {
    baseFields.push("promotion_extension.seller_ids")
  }

  if (includeOverrideExisting) {
    baseFields.push("promotion_extension.override_existing")
  }

  if (includeApplicableOn) {
    baseFields.push("promotion_extension.applicable_on")
  }

  return baseFields
}

/**
 * Maps promotion_extension object to additional_data format
 * Used when returning promotion data to admin/store APIs
 */
export function mapExtensionToAdditionalData(extension: any): {
  custom_tagline?: string | null
  terms_and_conditions?: string[]
  cart_sub_total?: number
  promo_code_upper_limit?: number
  seller_ids?: string[]
  first_customer?: boolean
  for_seller?: boolean
  is_hidden?: boolean
  override_existing?: boolean
  applicable_on?: 'all' | 'app' | 'web'
} | undefined {
  if (!extension) {
    return undefined
  }

  return {
    custom_tagline: extension.custom_tagline ?? null,
    terms_and_conditions: extension.terms_and_conditions ?? [],
    cart_sub_total: extension.cart_sub_total,
    promo_code_upper_limit: extension.promo_code_upper_limit,
    seller_ids: extension.seller_ids,
    first_customer: extension.first_customer,
    for_seller: extension.for_seller,
    is_hidden: extension.is_hidden,
    override_existing: extension.override_existing !== undefined 
      ? extension.override_existing 
      : true,
    applicable_on: extension.applicable_on ?? 'all'
  }
}

/**
 * Promotion Rules Cache Structure
 */
export interface PromotionRulesCache {
  promotion_id: string
  code: string
  status: string
  seller_ids: string[]
  product_rule_ids: string[]
  first_customer: boolean
  custom_tagline?: string | null
  terms_and_conditions?: string[]
  cart_sub_total: number
  promo_code_upper_limit: number
  for_seller: boolean
  override_existing: boolean
  applicable_on: 'all' | 'app' | 'web'
  cached_at: number
  /** application_method.type for workflow sort/correction */
  application_method_type?: 'percentage' | 'fixed'
  /** application_method.percentage_rate (number) for workflow */
  application_method_percentage_rate?: number
  /** application_method.value for fixed-amount promos */
  application_method_value?: number
  /** application_method.currency_code for currency normalization */
  application_method_currency_code?: string | null
  /** application_method.id for DB updates (e.g. currency normalization) */
  application_method_id?: string | null
  /** promotion_extension.is_hidden for store/PLP filtering */
  is_hidden?: boolean
  /** campaign.starts_at (ISO string) for workflow date filter */
  campaign_starts_at?: string | null
  /** campaign.ends_at (ISO string) for workflow date filter */
  campaign_ends_at?: string | null
}

/**
 * Get promotion rules from cache or database
 * @param promotionCode - Promotion code
 * @param container - Medusa container
 * @returns Promotion rules or null if not found
 */
export const getPromotionRulesWithCache = async (
  promotionCode: string,
  container: any
): Promise<PromotionRulesCache | null> => {
  // Validate promotion code is not empty
  if (!promotionCode || promotionCode.trim() === '') {
    return null
  }

  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    
    // Try to get from cache first using dedicated method
    const cached = await cacheService.getPromotionRules(promotionCode)
    
    if (cached) {
      return cached as PromotionRulesCache
    }
  
    // Cache miss - fetch from database
    const promotionRules = await fetchPromotionRulesFromDB(promotionCode, container)
    
    if (!promotionRules) {
      return null
    }
    
    // Store in cache with 1 hour TTL using dedicated method
    await cacheService.setPromotionRules(promotionCode, promotionRules, 3600)
    
    return promotionRules
  } catch (error) {
    console.error(`Error fetching promotion rules from cache for ${promotionCode}:`, error)
    return await fetchPromotionRulesFromDB(promotionCode, container)
  }
}

/**
 * Fetch promotion rules from database
 * @param promotionCode - Promotion code
 * @param container - Medusa container
 * @returns Promotion rules or null if not found
 */
function parseNumericValue(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value
  if (typeof value === 'string') return Number(value) || 0
  if (value && typeof value === 'object' && 'numeric' in value) {
    const n = (value as { numeric?: number }).numeric
    return typeof n === 'number' ? n : 0
  }
  if (value && typeof value === 'object' && 'value' in value) {
    const v = (value as { value?: unknown }).value
    if (typeof v === 'number') return v
    if (typeof v === 'string') return Number(v) || 0
  }
  return 0
}

const fetchPromotionRulesFromDB = async (
  promotionCode: string,
  container: any
): Promise<PromotionRulesCache | null> => {
  try {
    const promotionService = container.resolve(Modules.PROMOTION)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    
    // Get promotion with application_method and campaign for workflow/date filter
    const promotions = await promotionService.listPromotions(
      { code: [promotionCode] },
      {
        select: [
          "id", "code", "status",
          "application_method.id",
          "application_method.type",
          "application_method.percentage_rate",
          "application_method.value",
          "application_method.currency_code",
          "campaign.starts_at",
          "campaign.ends_at"
        ],
        relations: ["application_method", "campaign"]
      }
    )
    
    if (!promotions || promotions.length === 0) {
      return null
    }
    
    const promotion = promotions[0] as any
    const promotionId = promotion.id
    const applicationMethod = promotion.application_method
    const campaign = promotion.campaign
    const campaignStartsAt =
      campaign?.starts_at != null ? new Date(campaign.starts_at).toISOString() : null
    const campaignEndsAt =
      campaign?.ends_at != null ? new Date(campaign.ends_at).toISOString() : null
    
    // Fetch promotion extension
    const { data: promotionLinks } = await query.graph({
      entity: promotionExtensionLink.entryPoint,
      fields: getPromotionExtensionFields({
        includeSellerIds: true,
        includeOverrideExisting: true,
        includeApplicableOn: true
      }),
      filters: {
        promotion_id: promotionId,
      }
    })
    
    const link = promotionLinks[0]
    const promotionExtension = link?.promotion_extension
    
    // Get seller restrictions from seller_seller_promotion_promotion table
    // const restrictedSellerIds: string[] = await knex("seller_seller_promotion_promotion")
    //   .where({ promotion_id: promotionId })
    //   .whereNull("deleted_at")
    //   .pluck("seller_id")

    const restrictedSellerIds = await query.graph({
      entity: promotionSellerLink.entryPoint,
      fields: ["seller_id"],
      filters: {
        promotion_id: promotionId
      },
    })
    
    // Combine seller IDs from both sources
    let allSellerIds: string[] = []
    if (promotionExtension?.seller_ids && promotionExtension.seller_ids.length > 0) {
      allSellerIds = promotionExtension.seller_ids
    }
    if (restrictedSellerIds.length > 0) {
      if (allSellerIds.length > 0) {
        allSellerIds = allSellerIds.filter(id => restrictedSellerIds.includes(id))
      } else {
        allSellerIds = restrictedSellerIds
      }
    }
    
    // Get product rule IDs
    const productRuleIds: string[] = await knex("promotion_rule")
      .join('promotion_promotion_rule', 'promotion_promotion_rule.promotion_rule_id', 'promotion_rule.id')
      .where('promotion_promotion_rule.promotion_id', '=', promotionId)
      .where(function() {
        this.where('promotion_rule.attribute', '=', 'items.product.id')
            .orWhere('promotion_rule.attribute', '=', 'product')
      })
      .whereNull("promotion_rule.deleted_at")
      .pluck("promotion_rule.id")
    
    let productIds: string[] = []
    if (productRuleIds && productRuleIds.length > 0) {
      productIds = await knex("promotion_rule_value")
        .whereIn("promotion_rule_id", productRuleIds)
        .whereNull("deleted_at")
        .pluck("value")
    }
    
    const type = applicationMethod?.type
    const percentageRate = applicationMethod?.percentage_rate != null
      ? parseNumericValue(applicationMethod.percentage_rate)
      : undefined
    const methodValue = applicationMethod?.value != null
      ? parseNumericValue(applicationMethod.value)
      : undefined
    
    // Build cache object
    const cacheData: PromotionRulesCache = {
      promotion_id: promotionId,
      code: promotion.code!,
      status: promotion.status || 'draft',
      seller_ids: allSellerIds,
      product_rule_ids: productIds,
      first_customer: promotionExtension?.first_customer || false,
      custom_tagline: promotionExtension?.custom_tagline ?? null,
      terms_and_conditions: promotionExtension?.terms_and_conditions ?? [],
      cart_sub_total: promotionExtension?.cart_sub_total || 0,
      promo_code_upper_limit: promotionExtension?.promo_code_upper_limit || 0,
      for_seller: promotionExtension?.for_seller || false,
      override_existing: promotionExtension?.override_existing ?? true,
      applicable_on: (promotionExtension?.applicable_on as 'all' | 'app' | 'web') ?? 'all',
      cached_at: Date.now(),
      application_method_type: type === 'percentage' || type === 'fixed' ? type : undefined,
      application_method_percentage_rate: percentageRate,
      application_method_value: methodValue,
      application_method_currency_code: applicationMethod?.currency_code ?? null,
      application_method_id: applicationMethod?.id ?? null,
      is_hidden: promotionExtension?.is_hidden ?? false,
      campaign_starts_at: campaignStartsAt,
      campaign_ends_at: campaignEndsAt
    }
    
    return cacheData
  } catch (error) {
    console.error(`Error fetching promotion rules from DB for ${promotionCode}:`, error)
    return null
  }
}

/**
 * Invalidate promotion rules cache
 * @param promotionCode - Promotion code to invalidate
 * @param container - Medusa container
 */
export const invalidatePromotionCache = async (
  promotionCode: string,
  container: any
): Promise<void> => {
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    
    // Use dedicated invalidation method
    await cacheService.invalidatePromotionRules(promotionCode)
  } catch (error) {
    console.error(`Error invalidating cache for ${promotionCode}:`, error)
  }
}

/**
 * Invalidate promotion rules cache by ID
 * @param promotionId - Promotion ID
 * @param container - Medusa container
 */
export const invalidatePromotionCacheById = async (
  promotionId: string,
  container: any
): Promise<void> => {
  try {
    const promotionService = container.resolve(Modules.PROMOTION)
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    
    // Try to get promotion code from ID
    const promotions = await promotionService.listPromotions(
      { id: [promotionId] },
      { select: ["code"] }
    )
    
    if (promotions && promotions.length > 0 && promotions[0].code) {
      // Promotion exists - invalidate using code
      await invalidatePromotionCache(promotions[0].code, container)
    } else {
      // Promotion not found (probably deleted) - find and invalidate by pattern
      // Get all promotion cache keys
      const allKeys = await cacheService.keys('promotion_rules:*')
      
      // For each key, check if it contains this promotion ID
      for (const key of allKeys) {
        try {
          const cachedData = await cacheService.hget(key)
          if (cachedData && (cachedData as any).promotion_id === promotionId) {
            // Found the cache entry for this promotion
            await cacheService.hdel(key)
            return
          }
        } catch (error) {
          console.error(`Error checking cache key ${key}:`, error)
        }
      }
    }
  } catch (error) {
    console.error(`Error invalidating cache for promotion ID ${promotionId}:`, error)
  }
}

/** Cache key for enriched active promotions list (store + PLP) */
const ACTIVE_PROMOTIONS_ENRICHED_KEY = 'active_promotions_enriched'
const ACTIVE_PROMOTIONS_ENRICHED_TTL = 300 // 5 minutes

/**
 * Get active promotions with extensions from cache or DB.
 * Used by store promotions route and product-list to avoid repeated listActivePromotions + graph calls.
 */
export const getActivePromotionsEnriched = async (container: any): Promise<any[]> => {
  const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService

  try {
    const cached = await cacheService.get(ACTIVE_PROMOTIONS_ENRICHED_KEY)
    if (Array.isArray(cached)) return cached
  } catch (err) {
    console.error("Cache read failed:", err)
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const promotionService = getCustomPromotionService(container)

  const activePromotions = await (promotionService as any).listActivePromotions(
    {},
    {
      select: [
        "id","code","is_automatic","is_tax_inclusive","type","status",
        "created_at","updated_at","deleted_at","campaign_id",
        "campaign.*",
        "application_method.id",
        "application_method.type",
        "application_method.value",
        "application_method.percentage_rate",
        "application_method.currency_code"
      ],
      relations: [
        "campaign",
        "application_method",
        "application_method.target_rules",
        "application_method.target_rules.values"
      ],
      take: 10000
    }
  )

  if (!activePromotions?.length) {
    await cacheService.set(ACTIVE_PROMOTIONS_ENRICHED_KEY, [], ACTIVE_PROMOTIONS_ENRICHED_TTL)
    return []
  }

  /* ------------------ FETCH EXTENSIONS ------------------ */
  const promotionIds = activePromotions.map((p: any) => p.id)

  const { data: promotionLinks } = await query.graph({
    entity: promotionExtensionLink.entryPoint,
    fields: getPromotionExtensionFields({ includeApplicableOn: true }),
    filters: { promotion_id: promotionIds }
  })

  /* ------------------ BUILD EXTENSION MAP ------------------ */
  const extensionMap = new Map(
    promotionLinks
      .filter((l: any) => l.promotion_id && l.promotion_extension)
      .map((l: any) => [l.promotion_id, l.promotion_extension])
  )

  /* ------------------ MERGE PROMOS + EXTENSIONS ------------------ */
  let promotions = activePromotions.map((promo: any) => ({
    ...promo,
    promotion_extension: extensionMap.get(promo.id) ?? null
  }))

  /* ------------------ PARALLEL FALLBACK CACHE FETCH ------------------ */
  await Promise.all(
    promotions.map(async (promo: any) => {
      const ext = promo.promotion_extension
      if (ext && ext.first_customer === undefined && promo.code) {
        try {
          const rules = await getPromotionRulesWithCache(promo.code, container)
          ext.first_customer = Boolean(rules?.first_customer)
        } catch {
          ext.first_customer = false
        }
      }
    })
  )

  /* ------------------ FILTER HIDDEN ------------------ */
  promotions = promotions.filter((p: any) => !p.promotion_extension?.is_hidden)

  /* ------------------ CACHE WRITE ------------------ */
  try {
    await cacheService.set(
      ACTIVE_PROMOTIONS_ENRICHED_KEY,
      promotions,
      ACTIVE_PROMOTIONS_ENRICHED_TTL
    )
  } catch (err) {
    console.error("Cache write failed:", err)
  }

  return promotions
}
/**
 * Invalidate the active_promotions_enriched cache (call when promotions or extensions change).
 */
export const invalidateActivePromotionsEnriched = async (container: any): Promise<void> => {
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    await cacheService.invalidate(ACTIVE_PROMOTIONS_ENRICHED_KEY)
  } catch (error) {
    console.error('Error invalidating active_promotions_enriched:', error)
  }
}

