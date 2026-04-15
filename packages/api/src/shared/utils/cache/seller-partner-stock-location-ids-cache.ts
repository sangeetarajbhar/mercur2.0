import type { Knex } from 'knex'

import { container } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import type CacheModuleService from '../../../modules/cache/service'
import { RedisKey } from '../redisKey'

/**
 * Join path: seller ↔ stock location ↔ extension link ↔ extension row.
 * Soft-delete safe; `sle.status = '1'` = enabled (same as seller-inventories).
 */
function enabledSellerPartnerStockLocationsBaseQuery(
  knex: Knex,
  sellerId: string
) {
  return knex('seller_seller_stock_location_stock_location as ssl')
    .innerJoin(
      'stock_location_stock_location_extension as slsle',
      'slsle.stock_location_id',
      'ssl.stock_location_id'
    )
    .innerJoin(
      'stock_location_extension as sle',
      'sle.id',
      'slsle.stock_location_extension_id'
    )
    .where('ssl.seller_id', sellerId)
    .whereNull('ssl.deleted_at')
    .whereNull('slsle.deleted_at')
    .whereNull('sle.deleted_at')
    .where('sle.status', '1')
}

/**
 * Redis key for DB-backed enabled stock location ids for this seller + partner (hit / rebuild + setPermanent).
 */
export function sellerPartnerStockLocationIdsCacheKey(
  sellerId: string,
  partnerId: string
): string {
  return `${RedisKey.SELLER_PARTNER_STOCK_LOCATION_IDS}:${sellerId}:${partnerId.trim()}`
}

/**
 * Remove every `seller_partner_stock_location_ids:${sellerId}:*` Redis key only.
 * Next list request will repopulate on miss unless you call {@link refreshSellerPartnerStockLocationIdsCachesForSeller}.
 */
export async function clearSellerPartnerStockLocationIdsCachesForSeller(
  cacheService: CacheModuleService,
  sellerId: string
): Promise<void> {
  const pattern = `${RedisKey.SELLER_PARTNER_STOCK_LOCATION_IDS}:${sellerId}:*`
  const keys = await cacheService.keys(pattern)
  await Promise.all(keys.map((k) => cacheService.invalidate(k)))
}

/**
 * Clear partner id-list keys for the seller, then rebuild them from DB (enabled extensions only).
 * Call explicitly after location / extension DB changes that affect partner-scoped location lists.
 * Not coupled to `stock_location_cache` (warehouse Redis); keep those concerns separate.
 */
export async function refreshSellerPartnerStockLocationIdsCachesForSeller(
  cacheService: CacheModuleService,
  sellerId: string
): Promise<void> {
  await clearSellerPartnerStockLocationIdsCachesForSeller(cacheService, sellerId)
  await rebuildAllSellerPartnerStockLocationIdsForSeller(cacheService, sellerId)
}

/**
 * Refreshes partner stock-location id caches when a location may involve two seller ids (reassignment,
 * stale warehouse cache, etc.). Non-string / empty ids are ignored. Same normalized id → one rebuild only;
 * two distinct ids → rebuild both.
 */
export async function refreshSellerPartnerStockLocationIdsCachesForPreviousAndNewSeller(
  cacheService: CacheModuleService,
  previousSellerId: string | null | undefined,
  newSellerId: string | null | undefined
): Promise<void> {
  const prev =
    typeof previousSellerId === 'string' && previousSellerId.trim().length > 0
      ? previousSellerId.trim()
      : null
  const next =
    typeof newSellerId === 'string' && newSellerId.trim().length > 0
      ? newSellerId.trim()
      : null

  if (!prev && !next) {
    return
  }

  if (prev && next && prev === next) {
    await refreshSellerPartnerStockLocationIdsCachesForSeller(cacheService, prev)
    return
  }

  if (prev && next) {
    await refreshSellerPartnerStockLocationIdsCachesForSeller(cacheService, prev)
    await refreshSellerPartnerStockLocationIdsCachesForSeller(cacheService, next)
    return
  }

  await refreshSellerPartnerStockLocationIdsCachesForSeller(
    cacheService,
    (next ?? prev)!
  )
}

async function fetchDistinctPartnerIdsForSellerEnabledFromDb(
  sellerId: string
): Promise<string[]> {
  const knex = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION
  ) as unknown as Knex

  const rows = await enabledSellerPartnerStockLocationsBaseQuery(knex, sellerId)
    .whereNotNull('sle.partner_id')
    .select('sle.partner_id')
    .groupBy('sle.partner_id')

  return [
    ...new Set(
      rows
        .map((r: { partner_id?: string }) => r.partner_id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]
}

/**
 * Rebuild Redis `seller_partner_stock_location_ids:${sellerId}:${partnerId}` from DB for every
 * partner that currently has enabled locations for this seller.
 */
export async function rebuildAllSellerPartnerStockLocationIdsForSeller(
  cacheService: CacheModuleService,
  sellerId: string
): Promise<void> {
  const partnerIds = await fetchDistinctPartnerIdsForSellerEnabledFromDb(sellerId)
  await Promise.all(
    partnerIds.map((partnerId) =>
      rebuildSellerPartnerStockLocationIdsFromDb(
        cacheService,
        sellerId,
        partnerId
      )
    )
  )
}

async function fetchEnabledStockLocationIdsForSellerPartnerFromDb(
  sellerId: string,
  partnerId: string
): Promise<string[]> {
  const knex = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION
  ) as unknown as Knex

  const rows = await enabledSellerPartnerStockLocationsBaseQuery(knex, sellerId)
    .where('sle.partner_id', partnerId)
    .select('ssl.stock_location_id')
    .groupBy('ssl.stock_location_id')

  return rows
    .map((r: { stock_location_id?: string }) => r.stock_location_id)
    .filter(Boolean) as string[]
}

async function rebuildSellerPartnerStockLocationIdsFromDb(
  cacheService: CacheModuleService,
  sellerId: string,
  partnerId: string
): Promise<string[]> {
  const ids = await fetchEnabledStockLocationIdsForSellerPartnerFromDb(
    sellerId,
    partnerId
  )
  console.log(
    `Rebuilt seller-partner stock location ids for seller ${sellerId} and partner ${partnerId}`,
    ids
  )

  await cacheService.setPermanent(
    sellerPartnerStockLocationIdsCacheKey(sellerId, partnerId),
    ids
  )
  return ids
}

function parseCachedIds(raw: unknown): string[] | null {
  if (raw == null) {
    return null
  }
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string')
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string')
      }
    } catch {
      return null
    }
  }
  return null
}

/**
 * Enabled stock location ids for `partnerId` from Redis on hit, else DB rebuild + `setPermanent`.
 */
export async function getStockLocationIdsForPartnerFromCache(
  cacheService: CacheModuleService,
  sellerId: string,
  partnerId: string
): Promise<string[]> {
  const partnerNorm = partnerId.trim()
  const ck = sellerPartnerStockLocationIdsCacheKey(sellerId, partnerNorm)
  const raw = await cacheService.get(ck)
  const parsed = parseCachedIds(raw)

  if (parsed !== null) {
    console.log(
      '[seller-partner-stock-location-ids] redis hit (db candidate list)',
      {
        sellerId,
        partnerId: partnerNorm,
        candidateCount: parsed.length,
        candidates: parsed,
      }
    )
    return parsed
  }

  return rebuildSellerPartnerStockLocationIdsFromDb(
    cacheService,
    sellerId,
    partnerNorm
  )
}
