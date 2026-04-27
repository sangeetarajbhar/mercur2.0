import { MedusaContainer } from '@medusajs/framework'
import { calculateDeliveryPromiseFromZone } from '../../../../workflows/delivery-promise/steps'
import { resolveOmniLocationForProductsBulk } from './resolve-omni-location-bulk'
import type {
  DeliveryPromiseErrorResult,
  DeliveryPromiseResult
} from '../../../../workflows/delivery-promise/steps/calculate-delivery-promise-from-zone'

export type ProductPromise = {
  delivery_type: 'instant' | 'slotted' | null
  delivery_minutes: number | null
  message: string
  eta_iso?: string
  slot_id?: string
  slot_date?: string
  start_time?: string
  end_time?: string
  formatted_time_range?: string
}

export type CalculateProductListPromisesInput = {
  scope: MedusaContainer
  products: Array<{
    id: string
    min_price_variant_id?: string
    /**
     * Seller ID to use for promise calculation (preferred).
     * When present, we don't need to derive seller from variant pricing structures.
     */
    seller_id?: string
    variants?: Array<{
      id: string
      min_price_seller_id?: string
    }>
  }>
  zone_id: string
  cluster_id: string
}

/**
 * Calculate delivery promises for multiple products in product list
 * - Extracts min_price_variant_id from each product
 * - Uses seller_id directly from product response (preferred)
 * - Uses calculateDeliveryPromiseFromZone (same as PDP) for each product
 * 
 * @returns Map of product_id -> ProductPromise
 */


export async function calculateProductListPromises({
  scope,
  products,
  zone_id,
  cluster_id
}: CalculateProductListPromisesInput): Promise<Map<string, ProductPromise>> {

  try {
    const promiseMap = new Map<string, ProductPromise>()

    if (!zone_id || !products?.length) {
      return promiseMap
    }

    // Bucket products:
    // - Darkstore (Zilo): reuse a single promise for the whole cluster
    // - Others: handled by existing per-variant logic (unchanged for now)
    const ziloSellerId = process.env.ZILO_SELLER_ID ?? null
    const darkstoreProductIds: string[] = []
    const nonDarkstoreProducts: CalculateProductListPromisesInput["products"] = []

    for (const p of products) {
      const sellerId = (p as any)?.seller?.sellerId ?? null
      if (!sellerId || (ziloSellerId && sellerId === ziloSellerId)) {
        darkstoreProductIds.push(p.id)
      } else {
        nonDarkstoreProducts.push(p)
      }
    }

    // console.log('darkstoreProductIds', darkstoreProductIds)
    // console.log('nonDarkstoreProducts', nonDarkstoreProducts)

    // Darkstore promise: compute once per request and reuse
    if (darkstoreProductIds.length) {
      try {
        const result = await calculateDeliveryPromiseFromZone({
          scope,
          zone_id,
          location_id: cluster_id
        })

        if (result && !('error' in result) && 'delivery_type' in result) {
          const mapped: ProductPromise = {
            delivery_type: result.delivery_type || null,
            delivery_minutes: result.delivery_minutes || null,
            message: result.message || '',
            eta_iso: result.eta_iso,
            ...(result.delivery_type === 'slotted' && {
              slot_date: result.delivery_date
            })
          }

          for (const productId of darkstoreProductIds) {
            promiseMap.set(productId, mapped)
          }
        }
      } catch {
        // Best-effort: if darkstore promise fails, just skip setting it.
      }
    }

    // ─── Step 1: Build product → variant map ───────────────────────────────
    const productVariantMap = new Map<string, string>()
    for (const product of nonDarkstoreProducts) {
      const variantId =
        product.variants && product.variants.length > 0 ? product.variants[0].id : null

      if (variantId) {
        productVariantMap.set(product.id, variantId)
      }
    }

    // If we don't have variant_ids (PLP case: only product_id + seller_id),
    // resolve omni location by product inventory and de-dupe by seller+resolved location.
    if (!productVariantMap.size) {
      const resolvedLocationByProductId = await resolveOmniLocationForProductsBulk({
        scope,
        cluster_id,
        items: nonDarkstoreProducts.map((p) => ({
          product_id: p.id,
          seller_id: p.seller_id ?? null
        }))
      })
// 
      const groups = new Map<
        string,
        { sellerId: string; omniLocationId: string | null; productIds: string[] }
      >()

      for (const p of nonDarkstoreProducts) {
        const sellerId = p.seller_id ?? null
        if (!sellerId) continue

        const omniLocationId = resolvedLocationByProductId.get(p.id) ?? null
        const key = `${sellerId}:${omniLocationId || 'cluster'}:${zone_id}:${cluster_id}`

        const existing = groups.get(key)
        if (existing) {
          existing.productIds.push(p.id)
        } else {
          groups.set(key, { sellerId, omniLocationId, productIds: [p.id] })
        }
      }

      const requestCache = new Map<
        string,
        DeliveryPromiseResult | DeliveryPromiseErrorResult | null
      >()

      await Promise.all(
        Array.from(groups.entries()).map(async ([key, group]) => {
          try {
            const result = await calculateDeliveryPromiseFromZone({
              scope,
              zone_id,
              location_id: cluster_id,
              seller_id: group.sellerId,
              omni_location_id: group.omniLocationId
            })
            requestCache.set(key, result)
          } catch {
            requestCache.set(key, null)
          }
        })
      )

      for (const [key, group] of groups.entries()) {
        const result = requestCache.get(key)
        if (!result || 'error' in result || !('delivery_type' in result)) {
          continue
        }

        const mapped: ProductPromise = {
          delivery_type: result.delivery_type || null,
          delivery_minutes: result.delivery_minutes || null,
          message: result.message || '',
          eta_iso: result.eta_iso,
          ...(result.delivery_type === 'slotted' && {
            slot_date: result.delivery_date
          })
        }

        for (const productId of group.productIds) {
          promiseMap.set(productId, mapped)
        }
      }

      return promiseMap
    }

    // ─── Step 2: Pre-group unique computation keys ─────────────────────────
    const uniqueKeys = new Map<
      string,
      { variantId: string; sellerId: string | null }
    >()

    for (const product of nonDarkstoreProducts) {
      const variantId = productVariantMap.get(product.id)
      if (!variantId) continue

      const sellerId = product.seller_id || null
      const key = `${variantId}:${sellerId}:${zone_id}:${cluster_id}`

      if (!uniqueKeys.has(key)) {
        uniqueKeys.set(key, { variantId, sellerId })
      }
    }

    // ─── Step 3: Execute ONLY unique calls ────────────────────────────────
    const requestCache = new Map<
      string,
      DeliveryPromiseResult | DeliveryPromiseErrorResult | null
    >()

    await Promise.all(
      Array.from(uniqueKeys.entries()).map(async ([key, { variantId, sellerId }]) => {
        try {
          const result = await calculateDeliveryPromiseFromZone({
            scope,
            zone_id,
            location_id: cluster_id,
            seller_id: sellerId,
            variant_id: variantId
          })

          requestCache.set(key, result)
        } catch {
          requestCache.set(key, null)
        }
      })
    )

    // ─── Step 4: Map results back to products ─────────────────────────────
    for (const product of nonDarkstoreProducts) {
      const variantId = productVariantMap.get(product.id)
      if (!variantId) continue

      const sellerId = product.seller_id || null
      const key = `${variantId}:${sellerId}:${zone_id}:${cluster_id}`

      const result = requestCache.get(key)

      if (!result || 'error' in result || !('delivery_type' in result)) {
        continue
      }

      promiseMap.set(product.id, {
        delivery_type: result.delivery_type || null,
        delivery_minutes: result.delivery_minutes || null,
        message: result.message || '',
        eta_iso: result.eta_iso,
        ...(result.delivery_type === 'slotted' && {
          slot_date: result.delivery_date
        })
      })
    }

    return promiseMap

  } catch (error) {
    console.error('Error calculating product list promises:', error)
    return new Map()
  }
}